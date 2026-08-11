import { describe, expect, test } from "bun:test"

import {
  answerDeleted,
  answerFor,
  batchInput,
  raced,
  refused,
  uniqueIds,
  type BatchOutcome,
} from "../../../../../api/hono/src/lib/batch"
import { MAX_BATCH } from "../../../../../packages/config/src/console"

describe("uniqueIds", () => {
  test("keeps the order asked, so a result lines up with the request", () => {
    expect(uniqueIds(["c", "a", "b"])).toEqual(["c", "a", "b"])
  })

  test("drops repeats, so one id cannot be acted on twice in a set", () => {
    expect(uniqueIds(["a", "b", "a"])).toEqual(["a", "b"])
  })
})

// The route's own extra fields are not added here: a test in this slice cannot import zod itself, only modules that do. The ids rules are the part worth pinning anyway.
describe("batchInput", () => {
  const schema = batchInput({})
  const ids = (count: number) => Array.from({ length: count }, (_, index) => `id${index}`)

  test("takes a set of ids", () => {
    expect(schema.safeParse({ ids: ["a", "b"] }).success).toBe(true)
  })

  test("refuses an empty set, which would be a request that asks for nothing", () => {
    expect(schema.safeParse({ ids: [] }).success).toBe(false)
  })

  test("refuses a blank id rather than sending it to the database", () => {
    expect(schema.safeParse({ ids: ["  "] }).success).toBe(false)
  })

  test("caps the set, so one request cannot hold a transaction open over the table", () => {
    expect(schema.safeParse({ ids: ids(MAX_BATCH) }).success).toBe(true)
    expect(schema.safeParse({ ids: ids(MAX_BATCH + 1) }).success).toBe(false)
  })
})

describe("answerFor", () => {
  test("answers in the order asked, whatever order the writes happened in", () => {
    const outcomes = new Map<string, BatchOutcome>([
      ["b", { id: "b", ok: true }],
      ["a", refused("a", "FORBIDDEN", "You cannot ban an owner.")],
    ])
    expect(answerFor(["a", "b"], outcomes).map((row) => row.id)).toEqual(["a", "b"])
  })

  test("stands a raced row in for anything a branch forgot to record", () => {
    // The reason the fallback exists: a missing outcome must not reach the reader as null.
    const [only] = answerFor(["a"], new Map())
    expect(only).toEqual(raced("a"))
    expect(only.ok).toBe(false)
  })
})

describe("answerDeleted", () => {
  const rows = (...ids: string[]) => ids.map((id) => ({ id, value: `@${id}.com` }))

  test("an id the statement returned is gone, and says so", () => {
    expect(answerDeleted(["a", "b"], rows("a", "b"), "Rule not found")).toEqual([
      { id: "a", ok: true },
      { id: "b", ok: true },
    ])
  })

  test("an id that came back with nothing was already missing", () => {
    const [present, absent] = answerDeleted(["a", "b"], rows("a"), "Rule not found")
    expect(present).toEqual({ id: "a", ok: true })
    expect(absent).toEqual(refused("b", "NOT_FOUND", "Rule not found"))
  })

  test("answers in the order asked, not the order the rows came back", () => {
    const answers = answerDeleted(["c", "a", "b"], rows("b", "a", "c"), "Signup not found")
    expect(answers.map((answer) => answer.id)).toEqual(["c", "a", "b"])
  })

  test("carries the caller's wording, since a rule and a signup are not the same thing", () => {
    const [only] = answerDeleted(["a"], [], "Signup not found")
    expect(only.ok).toBe(false)
    expect(only).toEqual(refused("a", "NOT_FOUND", "Signup not found"))
  })

  test("nothing deleted refuses every id rather than answering empty", () => {
    expect(answerDeleted(["a", "b"], [], "Rule not found")).toHaveLength(2)
  })
})
