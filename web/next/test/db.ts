/**
 * Cleanup for the DB-writing tests so `test:all` leaves zero residue on its
 * own. The waitlist signup tests (HTTP and browser tiers) create throwaway
 * `smoke-*@example.test` rows; this removes them via @packages/db.
 *
 * Resilient by design: if the DB is unreachable (e.g. a local POSTGRES_URL that
 * doesn't point at the same database the API writes to), it warns with the
 * manual command instead of failing the run.
 */
import { db, waitlist } from "@packages/db"
import { like } from "drizzle-orm"

export const SMOKE_EMAIL_PATTERN = "smoke-%@example.test"

export async function cleanupSmokeRows(): Promise<void> {
  try {
    const deleted = await db
      .delete(waitlist)
      .where(like(waitlist.email, SMOKE_EMAIL_PATTERN))
      .returning({ email: waitlist.email })
    if (deleted.length > 0) console.log(`✓ cleaned ${deleted.length} smoke waitlist row(s)`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(
      `\n⚠ smoke-row cleanup skipped — DB unreachable (${msg}).\n` +
        `  POSTGRES_URL must point at the same database the API writes to.\n` +
        `  Clean up manually: delete from waitlist where email like '${SMOKE_EMAIL_PATTERN}';\n`,
    )
  }
}
