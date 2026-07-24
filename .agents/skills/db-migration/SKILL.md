---
name: db-migration
description: Create and apply a Drizzle schema change. Use when adding or altering tables, columns, or indexes in @packages/db, or when asked for a migration.
source: local
---

# Database Migration

PostgreSQL with Drizzle ORM. Schema lives in `packages/db/src/schema/`, migrations in `packages/db/drizzle/`. Schema, SQL, and snapshot travel together in one PR.

## 1. Edit the schema

- A new table gets its own `packages/db/src/schema/<name>.ts`, then an export from `index.ts`: `export * from "@/schema/<name>"`. Miss that export and the table never reaches a migration.
- For examples, read `auth.ts` (tables, relations, indexes) and `waitlist.ts` (a minimal non-auth table).
- Conventions: `text` primary keys (`.$defaultFn(() => crypto.randomUUID())` on non-auth tables), `timestamp("created_at").defaultNow().notNull()`, snake_case columns, `onDelete: "cascade"` on FKs, and an `index()` on every FK column.

## 2. Generate and review

```bash
bun run db:generate
```

Read the generated `packages/db/drizzle/NNNN_*.sql`. Done when that SQL, its `meta/NNNN_snapshot.json`, and a new `meta/_journal.json` entry all appear and the SQL matches the schema edit.

## 3. Apply

```bash
bun run db:migrate
```

This is local or ad-hoc only. On production and canary deploys the API build auto-applies pending migrations (`.github/scripts/migrate-on-deploy.ts`, gated on `VERCEL_ENV`/`VERCEL_GIT_COMMIT_REF`, PR previews skipped), so a migration merged to canary applies itself on the next deploy.

## 4. Make the running stack see it

```bash
bunx turbo run build --filter=@packages/db
```

The API consumes `@packages/db`'s built dist. If dev is running and the API imports the new table, restart dev entirely: `bun --hot` does not pick up new files or exports reliably (see the `dev` skill).

## 5. Inspect data

```bash
bun run db:studio
```

## Notes

- `POSTGRES_URL` comes from the root `.env`.
- Never edit an applied migration; generate a new one instead.
