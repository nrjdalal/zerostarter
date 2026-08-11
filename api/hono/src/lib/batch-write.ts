import { db, recordActivity, type ActivityEvent, type Transaction } from "@packages/db"

import { answerDeleted, type BatchOutcome } from "@/lib/batch"

// The delete half of the set protocol, which the allowlist and the waitlist ran identically: delete in one statement, read back which ids were actually there, record what went, then answer every id asked in the order asked.
// The caller supplies the statement, so the table and its returning shape keep their Drizzle types; what is shared is the transaction, the ordering, and the not-found answer. The part worth testing is answerDeleted, which is pure and lives in batch.ts.
export const deleteSet = async <R extends { id: string }>({
  missing,
  records,
  remove,
  targets,
}: {
  missing: string
  records: (rows: R[]) => ActivityEvent[]
  remove: (tx: Transaction) => Promise<R[]>
  targets: string[]
}): Promise<BatchOutcome[]> =>
  db.transaction(async (tx) => {
    const removed = await remove(tx)
    await recordActivity(tx, records(removed))
    return answerDeleted(targets, removed, missing)
  })
