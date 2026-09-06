# Re-run the team member_count backfill after the 1.7 release

- Status: planned
- Links: PR #821 (better-auth 1.7.3, migration `0004_better_auth_1_7.sql`)

## Why

Migration 0004 adds `team.member_count` and backfills it once, when canary applies it to the shared database. Production keeps serving better-auth 1.6 until the next release, and 1.6 does not maintain the column, so any team seat added or removed in that window leaves the count stale. Nothing in the starter code reads the column and teams have no UI yet, so the only behaviour that depends on it (the seat reservation behind a per-team cap) is unset. The number is client-visible all the same: `getFullOrganization` returns `teams[].memberCount`, and the dashboard sidebar loads it on every visit, unrendered.

## What

Once production serves 1.7.3, run the backfill statement from the migration once more against the shared database. It is idempotent:

```sql
UPDATE "team" SET "member_count" = (SELECT count(*) FROM "team_member" WHERE "team_member"."team_id" = "team"."id");
```
