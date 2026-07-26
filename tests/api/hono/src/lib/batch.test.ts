import { describe, expect, test } from "bun:test"

import {
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
