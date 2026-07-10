---
name: db-migration
description: Create and apply a Drizzle schema change. Use when adding or altering tables, columns, or indexes in @packages/db, or when asked for a migration.
---

# Database Migration

PostgreSQL + Drizzle ORM. Schema in `packages/db/src/schema/`, migrations in `packages/db/drizzle/`. Schema, SQL, and snapshot travel together in one PR.

## Workflow

### 1. Edit the schema

- New table: create `packages/db/src/schema/<name>.ts`, then export it from `index.ts`: `export * from "@/schema/<name>"`. Every new table must be exported there or it never reaches a migration.
- Examples: `auth.ts` for tables, relations, and indexes; `waitlist.ts` for a minimal non-auth table.
- Conventions: `text` primary keys (`.$defaultFn(() => crypto.randomUUID())` on non-auth tables), `timestamp("created_at").defaultNow().notNull()`, snake_case columns, `onDelete: "cascade"` on FKs, an `index()` on every FK column.

### 2. Generate and review

```bash
bun run db:generate
```

Read the generated `packages/db/drizzle/NNNN_*.sql`. Done when that SQL, its `meta/NNNN_snapshot.json`, and a new `meta/_journal.json` entry all appear and the SQL matches the schema edit.

### 3. Apply

```bash
bun run db:migrate
```

Local / ad-hoc only. The API build auto-applies pending migrations on production and canary deploys (`.github/scripts/migrate-on-deploy.ts`, gated on `VERCEL_ENV`/`VERCEL_GIT_COMMIT_REF`; PR previews skipped), so a migration merged to canary applies itself on the next deploy.

### 4. Make the running stack see it

```bash
bunx turbo run build --filter=@packages/db
```

The API consumes `@packages/db`'s built dist. If dev is running and the API imports the new table, restart dev entirely: `bun --hot` does not pick up new files or exports reliably (see the `dev` skill).

### 5. Inspect data

```bash
bun run db:studio
```

## Notes

- `POSTGRES_URL` comes from the root `.env`.
- Never edit an applied migration; generate a new one instead.
