// Applies a one-row-at-a-time endpoint across a selection.
//
// Capped rather than Promise.all over everything: each call re-reads the session past the cookie cache, which is a round trip from the web to the API, and each one counts against the per-user rate limit. A hundred selected rows would otherwise open a hundred concurrent requests and rate-limit themselves into failures the person then reads as refusals.
//
// Refused and failed are kept apart for the same reason. A guard saying no is the system working; a 429 or a dropped connection is not, and reporting both as "refused" tells someone their permissions are wrong when the network was.
const CONCURRENCY = 5

export type BulkOutcome = {
  done: number
  failed: number
  firstMessage: string | null
  refused: number
}

export async function runBulk<T>(
  items: T[],
  call: (item: T) => Promise<{ code: string; message: string } | null>,
): Promise<BulkOutcome> {
  const outcome: BulkOutcome = { done: 0, failed: 0, firstMessage: null, refused: 0 }
  const queue = [...items]
  const worker = async () => {
    for (;;) {
      const item = queue.shift()
      if (item === undefined) return
      let error: { code: string; message: string } | null
      try {
        error = await call(item)
      } catch (thrown) {
        error = {
          code: "NETWORK",
          message: thrown instanceof Error ? thrown.message : "Request failed",
        }
      }
      if (!error) {
        outcome.done += 1
        continue
      }
      if (error.code === "FORBIDDEN") outcome.refused += 1
      else outcome.failed += 1
      if (!outcome.firstMessage) outcome.firstMessage = error.message
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
  return outcome
}

// The one sentence a toast needs: what happened, in the caller's own verb, with refused and failed named separately.
export function describeBulk(outcome: BulkOutcome, verb: string): string {
  const parts = [`${outcome.done} ${verb}`]
  if (outcome.refused) parts.push(`${outcome.refused} refused`)
  if (outcome.failed) parts.push(`${outcome.failed} failed`)
  return parts.join(", ")
}
