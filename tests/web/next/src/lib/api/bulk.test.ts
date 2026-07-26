import { describe, expect, test } from "bun:test"

import {
  describeBulk,
  foldBatch,
  type BatchResult,
} from "../../../../../../web/next/src/lib/api/bulk"

const ok = (id: string): BatchResult => ({ id, ok: true })
const no = (id: string, code: string, message: string): BatchResult => ({
  code,
  id,
  message,
  ok: false,
})
const answered = (results: BatchResult[]) => ({ data: { results }, error: null })

describe("foldBatch", () => {
  test("counts what got through", () => {
    expect(foldBatch(["a", "b", "c"], answered([ok("a"), ok("b"), ok("c")]))).toEqual({
      done: 3,
      failed: 0,
      firstMessage: null,
      refused: 0,
    })
  })

  test("keeps a guard refusal apart from a failure, since one is the system working", () => {
    const outcome = foldBatch(
      ["a", "b", "c"],
      answered([
        ok("a"),
        no("b", "FORBIDDEN", "You cannot ban an owner."),
        no("c", "CONFLICT", "Raced."),
      ]),
    )
    expect(outcome.done).toBe(1)
    expect(outcome.refused).toBe(1)
    expect(outcome.failed).toBe(1)
  })

  test("a row that vanished is a failure, not a refusal: nobody told this person no", () => {
    const outcome = foldBatch(["a"], answered([no("a", "NOT_FOUND", "Rule not found")]))
    expect(outcome.failed).toBe(1)
    expect(outcome.refused).toBe(0)
  })

  test("keeps the first message there is to show", () => {
    const outcome = foldBatch(
      ["a", "b"],
      answered([no("a", "FORBIDDEN", "first"), no("b", "CONFLICT", "second")]),
    )
    expect(outcome.firstMessage).toBe("first")
  })

  test("a refused request means none of it happened, so every id failed", () => {
    // One request now carries the whole selection: a 429 or a dead connection is not a partial result.
    const outcome = foldBatch(["a", "b", "c"], {
      data: null,
      error: { code: "TOO_MANY_REQUESTS", message: "Slow down." },
    })
    expect(outcome).toEqual({ done: 0, failed: 3, firstMessage: "Slow down.", refused: 0 })
  })

  test("says something even when the failure carried no message", () => {
    const outcome = foldBatch(["a"], { data: null, error: null })
    expect(outcome.firstMessage).toBe("Request failed")
  })

  test("an empty selection folds to nothing rather than throwing", () => {
    expect(foldBatch([], answered([]))).toEqual({
      done: 0,
      failed: 0,
      firstMessage: null,
      refused: 0,
    })
  })
})

describe("describeBulk", () => {
  test("names only what happened", () => {
    expect(describeBulk({ done: 3, failed: 0, firstMessage: null, refused: 0 }, "removed")).toBe(
      "3 removed",
    )
  })

  test("reports refused and failed separately, in that order", () => {
    expect(describeBulk({ done: 1, failed: 2, firstMessage: "x", refused: 3 }, "banned")).toBe(
      "1 banned, 3 refused, 2 failed",
    )
  })

  test("still leads with the count when none got through", () => {
    expect(describeBulk({ done: 0, failed: 0, firstMessage: "x", refused: 2 }, "changed")).toBe(
      "0 changed, 2 refused",
    )
  })
})
