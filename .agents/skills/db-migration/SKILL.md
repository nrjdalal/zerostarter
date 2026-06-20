---
name: db-migration
description: Create and apply database schema changes with Drizzle. Use when adding or modifying tables, columns, or indexes in @packages/db, or when the user asks for a migration.
---

# Database Migration

PostgreSQL + Drizzle ORM. Schema lives in `packages/db/src/schema/`, migrations in `packages/db/drizzle/`.

## Workflow

### 1. Edit the schema

- New table: create `packages/db/src/schema/<name>.ts` (see `auth.ts` for table definitions, relations, and indexes)
- Export it from `packages/db/src/schema/index.ts`: `export * from "@/schema/<name>"`
- Conventions: `text` primary keys (`crypto.randomUUID()` default for non-auth tables), `timestamp("created_at").defaultNow().notNull()`, snake_case column names, `CASCADE` on FK deletes, indexes on FK columns

### 2. Generate and review

```bash
bun run db:generate
```

Review the generated SQL in `packages/db/drizzle/` before applying. Check `meta/_journal.json` got a new entry.

### 3. Apply

```bash
bun run db:migrate
```

Local / ad-hoc only. On Vercel the **API build auto-applies pending migrations** on production and canary deploys (`.github/scripts/migrate-on-deploy.ts`, gated on `VERCEL_ENV`/branch; PR previews are skipped), so merging a migration to canary applies it automatically on the next deploy.

### 4. Make the running stack see it

```bash
bunx turbo run build --filter=@packages/db
```

The API consumes `@packages/db`'s built dist. If the dev server is running and the API imports the new table, **restart dev entirely**, `bun --hot` does not pick up new files/exports reliably (see the `dev` skill).

### 5. Inspect data

```bash
bun run db:studio
```

## Notes

- `POSTGRES_URL` comes from the root `.env`
- Never edit applied migration files; generate a new migration instead
- Migrations are part of the PR that needs them, schema + SQL + snapshot travel together
