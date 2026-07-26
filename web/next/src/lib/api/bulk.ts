import { MAX_BATCH } from "@packages/config/console"

import { toast } from "@/components/ui/toast"

// A per-id outcome from a set route, the shape api/hono/src/lib/batch.ts returns.
export type BatchResult = { id: string } & (
  | { ok: true }
  | { code: string; message: string; ok: false }
)

export type BulkOutcome = {
  done: number
  failed: number
  firstMessage: string | null
  refused: number
}

// Folds what a set route answered into the counts a toast reads, keeping a guard refusal apart from a failure: a guard saying no is the system working, a 429 or a dropped connection is not, and reporting both as refused tells someone their permissions are wrong when the network was.
// The request-level error is the other half of the same job. One request now carries the whole selection, so a 429 or a dead connection means none of it happened, and every id is a failure rather than one line of a partial result.
export function foldBatch(
  ids: string[],
  result: {
    data: { results: BatchResult[] } | null
    error: { code: string; message: string } | null
  },
): BulkOutcome {
  if (!result.data) {
    return {
      done: 0,
      failed: ids.length,
      firstMessage: result.error ? result.error.message : "Request failed",
      refused: 0,
    }
  }
  const outcome: BulkOutcome = { done: 0, failed: 0, firstMessage: null, refused: 0 }
  for (const row of result.data.results) {
    if (row.ok) {
      outcome.done += 1
      continue
    }
    // Only a guard refusal is a refusal. A rule that vanished or a row that raced another admin is a failure, because neither is this person being told no.
    if (row.code === "FORBIDDEN") outcome.refused += 1
    else outcome.failed += 1
    if (!outcome.firstMessage) outcome.firstMessage = row.message
  }
  return outcome
}

// Runs a selection through a set route, splitting it at the cap the route enforces.
// The tables load more as you scroll and select-all takes every loaded row, so a selection can outgrow one request. Splitting here keeps that working: without it the whole action is rejected as invalid input, which reads as nothing happening for the exact selections the set routes exist to serve.
// Sequential, not concurrent: the point of a set route is that one intent costs one request at a time, and a chunked selection should not spend the rate limit or the lock window any faster than one.
export async function runBatched(
  ids: string[],
  call: (slice: string[]) => Promise<{
    data: { results: BatchResult[] } | null
    error: { code: string; message: string } | null
  }>,
): Promise<BulkOutcome> {
  const total: BulkOutcome = { done: 0, failed: 0, firstMessage: null, refused: 0 }
  for (let at = 0; at < ids.length; at += MAX_BATCH) {
    const slice = ids.slice(at, at + MAX_BATCH)
    const outcome = foldBatch(slice, await call(slice))
    total.done += outcome.done
    total.failed += outcome.failed
    total.refused += outcome.refused
    if (!total.firstMessage) total.firstMessage = outcome.firstMessage
  }
  return total
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
