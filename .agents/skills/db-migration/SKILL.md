---
name: db-migration
description: Create and apply a Drizzle schema change. Use when adding or altering tables, columns, or indexes in @packages/db, or when asked for a migration.
source: local
---

# Database Migration

PostgreSQL with Drizzle ORM: schema in `packages/db/src/schema/`, migrations in `packages/db/drizzle/`. Schema, SQL and snapshot travel together in one PR, and every step runs against a throwaway database until the change merges.

## 0. Show the schema and wait

Post the table or the altered columns and name the choices that are hard to reverse: nullability and what a null means, foreign keys and their delete behavior, indexes, derived or generated values, retention. Then stop. A shape is cheap to argue about and expensive to change once rows exist, and applied to a deployed database it is live under running code the moment it runs (in the canonical starter `canary` and production share one, so applying there reaches production). Done when the user has said go on the posted shape.

## 1. Point the worktree at a throwaway database

Every `db:*` script validates `NODE_ENV` and `POSTGRES_URL` before it runs, and the dev stack that step 5 restarts validates the rest, so a worktree with no `.env` copies the primary checkout's first (the `dev` skill) and then points it at its own database:

```bash
bunx pglaunch@5.5.7 -k    # disposable Postgres; -k keeps it, and the name defaults to the directory, so each worktree gets its own
```

Write the URL it prints over the worktree `.env`'s `POSTGRES_URL`, with `NODE_ENV=local`. The output is colorized, so a script that captures it strips the escapes first (`| sed $'s/\033\\[[0-9;]*m//g'`): an escape left on the URL makes drizzle-kit exit 1 with no message. The command returns as soon as the container starts, so wait for `docker exec <container> pg_isready` before the next step. Seed fake rows; a deployed database holds real people (in the canonical starter, the shared one), and a screenshot or response body from it stays out of every PR. pglaunch publishes the container's port on every network interface with user and password `postgres`, so any host on the same network can read and write it: keep it to a network you trust. Done when `pg_isready` answers from the container (its suffixed name is on pglaunch's `started` line) and the worktree `.env` carries its URL, with no deployed database's URL anywhere in the worktree.

## 2. Edit the schema

- `auth.ts` is generated: declare a plugin or a `user.additionalFields` column in `packages/auth/src/schema.ts`, run `bun run auth:schema`, and continue with the regenerated file (in the canonical starter a hand edit fails `tests/packages/db/src/schema/auth.test.ts`). A plugin that brings its own table also needs that table's export added to the `schema` map `drizzleAdapter` takes in `packages/auth/src/index.ts`, which lists the tables by hand. Better Auth's schema check, on by default (the instance never sets `advanced.database.validateSchema`), compares that map with the tables the plugins declare, so the generator, the migration and the build all pass, then the api logs `Drizzle schema mismatch` with the table under `Missing tables` at startup and every auth call throws it: every request under `/api/auth` but `/providers`, which the api answers itself, and every session read, so every `/api/v1` request too, not only the plugin's. A `session` column goes in the same declaration, but its `satisfies Pick<BetterAuthOptions, "plugins" | "user">` refuses a `session` key until `"session"` joins the Pick, and the instance in `packages/auth/src/index.ts` spreads `schemaOptions` after its own `session: { cookieCache }`, so merge the two there or the spread replaces the cookie cache.
- Files group by concern: `auth.ts` holds the Better Auth tables, `console.ts` the ones the console owns. A new table joins its concern's file, or starts one. drizzle-kit migrates every file in `src/schema/` whatever `index.ts` says, but a new file needs `export * from "@/schema/<name>"` in `index.ts`, or the typed `db` client and every `@packages/db` import never see its tables.
- Every file names its columns in snake_case. Outside the generated `auth.ts`, with `waitlist.ts` as the example, `created_at` is `timestamp("created_at").defaultNow().notNull()` and the primary key is `text` filled by `.$defaultFn(() => crypto.randomUUID())`. A new table's foreign key is `onDelete: "cascade"` with an index on its column. That rule comes from the generated `auth.ts`, where every foreign key cascades and all but `invitation.inviter_id` are indexed; `waitlist.ts` has no foreign key, and the console tables bend it for their `actor_id`. A provenance column like that bends both halves: `onDelete: "set null"` when the row outlives the reference, and no index until the table's row counts and query plans ask for one (`activity` grows without bound and still ships without one), with the readable actor text stored beside it, so a row still names its actor once the account is gone (`activity.actor`, never null; `allowlist.actor`, null only for a rule seeded outside the console).

Done when the file exports from `index.ts` and every column follows a convention or names its reason.

## 3. Generate and review

```bash
bun run db:generate --name <change>    # named like the existing ones, 0001_waitlist
```

Read the generated `packages/db/drizzle/NNNN_<change>.sql`. An applied migration is immutable; a fix is a new one. Done when the SQL, its `meta/NNNN_snapshot.json` and a new `meta/_journal.json` entry all appear and the SQL matches the edit.

## 4. Apply

```bash
bun run db:migrate
```

Local and ad hoc only on Vercel: there the API build applies pending migrations on production and `canary` deploys (`api/hono/vercel.json` runs `.github/scripts/migrate-on-deploy.ts`, and PR previews skip it), so a migration merged to canary lands on the next deploy. The Docker images never migrate, so a Docker deploy runs `bun run db:migrate` against the database its containers read. Done when it exits 0 against the container and `docker exec <container> psql -U postgres -c '\d <table>'` shows the new shape (`bun run db:studio` shows it in a browser).

## 5. Make the running stack see it

```bash
bunx turbo run build --filter=@packages/db
```

The API consumes the built dist, and a new table or export needs a full restart of dev (the `dev` skill); with no stack running, the build alone is the step. Done when `rg <column or table> packages/db/dist` finds the change and, with dev running, the API answers for it.
