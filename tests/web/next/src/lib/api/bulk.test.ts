import { describe, expect, test } from "bun:test"

import { describeBulk, runBulk } from "../../../../../../web/next/src/lib/api/bulk"

const forbidden = { code: "FORBIDDEN", message: "You can only ban people below your own role." }
const rateLimited = { code: "TOO_MANY_REQUESTS", message: "Too many requests" }

describe("runBulk", () => {
  test("counts what got through", async () => {
    const outcome = await runBulk([1, 2, 3], async () => null)
    expect(outcome).toEqual({ done: 3, failed: 0, firstMessage: null, refused: 0 })
  })

  test("calls once per item, and every item exactly once", async () => {
    const seen: number[] = []
    const items = Array.from({ length: 23 }, (_, index) => index)
    await runBulk(items, async (item) => {
      seen.push(item)
      return null
    })
    expect(seen.sort((a, b) => a - b)).toEqual(items)
  })

  test("keeps a guard refusal apart from a failure, since one is the system working", async () => {
    const outcome = await runBulk([1, 2, 3, 4], async (item) => {
      if (item === 1) return forbidden
      if (item === 2) return rateLimited
      return null
    })
    expect(outcome.done).toBe(2)
    expect(outcome.refused).toBe(1)
    expect(outcome.failed).toBe(1)
  })

  test("reads a thrown error as a failure, not a refusal", async () => {
    const outcome = await runBulk([1], async () => {
      throw new Error("Network request failed")
    })
    expect(outcome).toEqual({
      done: 0,
      failed: 1,
      firstMessage: "Network request failed",
      refused: 0,
    })
  })

  test("keeps one message to show when nothing got through", async () => {
    // Which one is whichever failure lands first, and with work in flight that is not ordered; what matters is that a caller always has a real reason to show rather than none.
    const outcome = await runBulk([1, 2], async (item) =>
      item === 1 ? forbidden : { code: "FORBIDDEN", message: "second" },
    )
    expect([forbidden.message, "second"]).toContain(outcome.firstMessage as string)
  })

  test("a single failure's message is the one kept, with nothing to race it", async () => {
    const outcome = await runBulk([1], async () => forbidden)
    expect(outcome.firstMessage).toBe(forbidden.message)
  })

  test("never runs more than the cap at once", async () => {
    let live = 0
    let peak = 0
    await runBulk(
      Array.from({ length: 40 }, (_, index) => index),
      async () => {
        live += 1
        peak = Math.max(peak, live)
        await Promise.resolve()
        live -= 1
        return null
      },
    )
    // Both bounds: the upper one is the cap, and the lower one is what shows the work actually overlaps. Without it this passes at a concurrency of one.
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThanOrEqual(5)
  })

  test("an empty selection does nothing rather than hanging on idle workers", async () => {
    expect(await runBulk([], async () => null)).toEqual({
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
