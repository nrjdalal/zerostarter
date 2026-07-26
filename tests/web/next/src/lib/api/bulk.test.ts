import { describe, expect, test } from "bun:test"

import type { BatchOutcome, BatchRefusalCode } from "../../../../../../api/hono/src/lib/batch"
import { MAX_BATCH } from "../../../../../../packages/config/src/console"
import { describeBulk, foldBatch, runBatched } from "../../../../../../web/next/src/lib/api/bulk"

const ok = (id: string): BatchOutcome => ({ id, ok: true })
const no = (id: string, code: BatchRefusalCode, message: string): BatchOutcome => ({
  code,
  id,
  message,
  ok: false,
})
const answered = (results: BatchOutcome[]) => ({ data: { results }, error: null })

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

describe("runBatched", () => {
  test("splits a selection at the cap the route enforces", async () => {
    // The tables load more as you scroll and select-all takes every loaded row, so a selection can outgrow one request. Before this split, the route rejected the whole thing as invalid input and the action silently did nothing.
    const sent: number[] = []
    const ids = Array.from({ length: MAX_BATCH * 2 + 7 }, (_, index) => `id${index}`)
    const outcome = await runBatched(ids, async (slice) => {
      sent.push(slice.length)
      return { data: { results: slice.map((id) => ({ id, ok: true as const })) }, error: null }
    })
    expect(sent).toEqual([MAX_BATCH, MAX_BATCH, 7])
    expect(outcome.done).toBe(ids.length)
  })

  test("sends one request when the selection fits", async () => {
    let calls = 0
    await runBatched(["a", "b"], async (slice) => {
      calls += 1
      return { data: { results: slice.map((id) => ({ id, ok: true as const })) }, error: null }
    })
    expect(calls).toBe(1)
  })

  test("stops once the request itself is refused, and counts the rest as untried", async () => {
    // A 429 is about the request, not the rows, so the chunks after it would be refused the same way. Sending them spends the rate limit hardest exactly when it has run out.
    let calls = 0
    const ids = Array.from({ length: MAX_BATCH * 3 }, (_, index) => `id${index}`)
    const outcome = await runBatched(ids, async () => {
      calls += 1
      return { data: null, error: { code: "TOO_MANY_REQUESTS", message: "Slow down." } }
    })
    expect(calls).toBe(1)
    expect(outcome).toEqual({
      done: 0,
      failed: ids.length,
      firstMessage: "Slow down.",
      refused: 0,
    })
  })

  test("adds up what every chunk did, and keeps the first message there was", async () => {
    const ids = Array.from({ length: MAX_BATCH + 2 }, (_, index) => `id${index}`)
    const outcome = await runBatched(ids, async (slice) =>
      slice.length === MAX_BATCH
        ? {
            data: {
              results: slice.map((id, index) =>
                index === 0
                  ? { code: "FORBIDDEN", id, message: "first", ok: false as const }
                  : { id, ok: true as const },
              ),
            },
            error: null,
          }
        : { data: null, error: { code: "NETWORK_ERROR", message: "second" } },
    )
    expect(outcome).toEqual({
      done: MAX_BATCH - 1,
      failed: 2,
      firstMessage: "first",
      refused: 1,
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
