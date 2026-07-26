import { toast } from "@/components/ui/toast"

// How many of a selection's rows are in flight at once. Each call re-reads the session past the cookie cache, a round trip from the web to the API, and each one counts against the per-user rate limit, so a hundred selected rows would otherwise rate-limit themselves into failures the person reads as refusals.
const CONCURRENCY = 5

export type BulkOutcome = {
  done: number
  failed: number
  firstMessage: string | null
  refused: number
}

// Applies a one-row-at-a-time endpoint across a selection, keeping a guard refusal apart from a failure: a guard saying no is the system working, a 429 or a dropped connection is not, and reporting both as refused tells someone their permissions are wrong when the network was.
export async function runBulk<T>(
  items: T[],
  call: (item: T) => Promise<{ code: string; message: string } | null>,
): Promise<BulkOutcome> {
  const outcome: BulkOutcome = { done: 0, failed: 0, firstMessage: null, refused: 0 }
  // An index cursor rather than shifting a queue and testing for undefined, which would stop early on a list that legitimately contains one.
  let cursor = 0
  const worker = async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      const item = items[index]
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

// The toast every bulk caller was writing by hand: the reason on its own when nothing got through, a warning when part of it failed, a success otherwise.
export function toastBulk(outcome: BulkOutcome, verb: string, singular?: string) {
  if (!outcome.done && outcome.firstMessage)
    return toast.add({ title: outcome.firstMessage, type: "error" })
  if (singular && outcome.done === 1 && !outcome.failed && !outcome.refused) {
    return toast.add({ title: singular, type: "success" })
  }
  const message = describeBulk(outcome, verb)
  // A refusal is the system working, so it stays a success; a failure is not, and green over "2 removed, 1 failed" overstates it.
  return outcome.failed === 0
    ? toast.add({ title: message, type: "success" })
    : toast.add({ title: message, type: "warning" })
}
