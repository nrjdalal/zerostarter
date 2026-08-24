# Set account.issuer NOT NULL after the 1.7 release ships

- Status: planned
- Links: the better-auth 1.7 upgrade PR (chore/deps-latest)

The 1.7 upgrade added `account.issuer` nullable on purpose: canary and production share one database, and production keeps running better-auth 1.6 until the next canary-to-main release. 1.6 inserts account rows without an issuer, so a NOT NULL column would fail every new production sign-up in that window. The drizzle schema already declares `.notNull()`, so the column is drifted from the database by design.

Once production runs 1.7 (the release after the upgrade merges), close the gap:

1. Backfill any rows 1.6 wrote during the window, same CASE as `0004_account_issuer.sql`: `google` to `https://accounts.google.com`, `credential` to `local:credential`, else `local:oauth:<provider_id>`.
2. `bun run db:generate` then picks up the drift and emits `ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL`; prepend the backfill UPDATE to that migration.

A user whose account row was created by 1.6 in the window and who signs in again on 1.7 before the backfill gets a duplicate account row (1.7 cannot match a NULL issuer), so cut the release and run this promptly after it ships.
