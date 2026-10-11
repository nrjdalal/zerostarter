---
name: db-migration
description: Create and apply a Drizzle schema change. Use when adding or altering tables, columns, or indexes in @packages/db, or when asked for a migration.
source: local
---

# Database Migration

PostgreSQL with Drizzle ORM: schema in `packages/db/src/schema/`, migrations in `packages/db/drizzle/`. Schema, SQL and snapshot travel together in one PR, and every step runs against a throwaway database until the change merges.

## 0. Show the schema and wait

Post the table or the altered columns and name the choices that are hard to reverse: nullability and what a null means, foreign keys and their delete behavior, indexes, derived or generated values, retention. Then stop. A shape is cheap to argue about and expensive to change once rows exist, and `canary` and production share one database, so applying reaches production the moment it runs. Done when the user has said go on the posted shape.

## 1. Edit the schema

- `auth.ts` is generated: declare a plugin or an `additionalFields` column in `packages/auth/src/schema.ts`, run `bun run auth:schema`, and continue with the regenerated file (a hand edit fails `tests/packages/db/src/schema/auth.test.ts`).
- Files group by concern: `auth.ts` holds the Better Auth tables, `console.ts` the ones the console owns. A new table joins its concern's file, or starts one, and that file needs `export * from "@/schema/<name>"` in `index.ts`, or the table never reaches a migration.
- Conventions, with `auth.ts` and `waitlist.ts` as the examples: `text` primary keys (`.$defaultFn(() => crypto.randomUUID())` outside auth), `timestamp("created_at").defaultNow().notNull()`, snake_case columns, `onDelete: "cascade"` with an `index()` on every FK column. A provenance column bends both: `onDelete: "set null"` when the row outlives the reference, and no index when nothing queries by the column and the table stays small, with the readable actor text stored beside it (`activity.actor`, `allowlist.actor`) so a row never goes anonymous.

Done when the file exports from `index.ts` and every column follows a convention or names its reason.

## 2. Generate and review

```bash
bun run db:generate
```

Read the generated `packages/db/drizzle/NNNN_*.sql`. An applied migration is immutable; a fix is a new one. Done when the SQL, its `meta/NNNN_snapshot.json` and a new `meta/_journal.json` entry all appear and the SQL matches the edit.

## 3. Point the worktree at a throwaway database

```bash
bunx pglaunch -k    # disposable Postgres, kept across restarts
```

Put the URL it prints in the worktree's own `.env` as `POSTGRES_URL`, one container per worktree. The output is colorized, so a script that captures it strips the escapes first (`| sed $'s/\033\\[[0-9;]*m//g'`): an escape left on the URL makes `drizzle-kit migrate` exit 1 with no message. Seed fake rows; the shared database holds real people, and a screenshot or response body from it stays out of every PR. Done when the worktree `.env` names the container and the shared URL appears nowhere in the branch.

## 4. Apply

```bash
bun run db:migrate
```

Local and ad hoc only: on canary and production deploys the API build applies pending migrations itself (`.github/scripts/migrate-on-deploy.ts`, PR previews skipped), so a migration merged to canary lands on the next deploy. Done when it exits 0 against the container.

## 5. Make the running stack see it

```bash
bunx turbo run build --filter=@packages/db
```

The API consumes the built dist, and a new table or export needs a full restart of dev (the `dev` skill). `bun run db:studio` shows the rows. Done when the API answers for the new table.
