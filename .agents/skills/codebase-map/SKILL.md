---
name: codebase-map
description: Orient fast in this repo: what file to edit for a given change, how to trace a feature across the stack, and how to search the codebase. Use at the start of a task in an unfamiliar area, when unsure where something belongs, or before making a cross-cutting change.
---

# Codebase Map

One Bun + Turborepo monorepo: two deployable apps over four shared packages. Imports use `@api/hono`, `@packages/*`, and the `@/` alias (never deep relative paths).

```
api/hono/         # backend (Hono): routers, middlewares, the AppType export
web/next/         # frontend (Next.js App Router): app/, components/, lib/, content/
packages/auth/    # Better Auth instance
packages/db/      # Drizzle schema + client
packages/env/     # type-safe env, one validated entry per consumer
packages/config/  # TS base, tsdown factory, and site.ts (brand identity)
packages/cli/     # the zerostarter scaffolding CLI (canonical repo only; init strips it)
```

Read `AGENTS.md` first (the rules), and `curl localhost:3000/llms-full.txt` for the whole codebase as one context file.

## Where to edit for X

| Goal | Edit here | Then |
| --- | --- | --- |
| Add/change an API route | `api/hono/src/routers/<name>.ts` → export from `routers/index.ts` → mount in `src/index.ts` `.route()` chain | `api-endpoint` skill |
| Change the database schema | `packages/db/src/schema/<name>.ts` → export from `schema/index.ts` | `db-migration` skill |
| Add/change a page | `web/next/src/app/`, groups: `(protected)` dashboard, `(console)` admin, `(content)` docs+blog | - |
| Add/customize a UI component | `web/next/src/components/`: `ui/` is generated shadcn, don't hand-edit | `design`, `shadcn-sync` skills |
| Call the API from the web app | `web/next/src/lib/api/client.ts` (`apiClient`, `unwrap`) | - |
| Rebrand (name, description, socials) | `packages/config/src/site.ts`, one file | - |
| Add or read an env var | `packages/env/src/{api-hono,auth,db,web-next}.ts`; read via `@packages/env/*`, never `process.env` | - |
| Configure auth (providers, plugins) | `packages/auth/src/index.ts` | - |
| Gate by role | `web/next/src/lib/auth/console.ts` gates the web admin console; the API's `middlewares/auth.ts` checks the session only (401), not role | - |
| Change the error/response shape | `api/hono/src/lib/error.ts` (the `{ error: { code, message } }` handler) | - |
| Change docs structure/sidebar | `web/next/docs.config.ts`, single source; `meta.json` is generated | - |

## Trace a feature across the stack

Types flow one direction, so a change ripples predictably:

```
packages/db/src/schema  →  api/hono/src/routers  →  api/hono/src/index.ts (AppType)  →  web/next/src/lib/api/client.ts  →  app / components
```

To add a field end to end: edit the schema and migrate, select/return it in the router, and it is typed automatically at every `apiClient` call site; the compiler lists each place that must change. Nothing ships half-updated.

## Entry points (read these first)

- `AGENTS.md`, the conventions and rules.
- `api/hono/src/index.ts`, the route chain and `export type AppType` (the whole API shape in one file).
- `web/next/src/app/layout.tsx`, the web root.
- `packages/config/src/site.ts`, brand identity and injectable content.

## Fast find

```bash
rg -n "\.route\(" api/hono/src/index.ts          # every mounted router
rg -n "export const \w+Router" api/hono/src/routers   # every router definition
ls packages/db/src/schema                          # every schema file (tables)
rg -n "apiClient\." web/next/src                    # every API call site
rg -n "SOME_ENV_VAR" packages/env                   # where an env var is declared
ls .agents/skills                                   # every task skill available
```

## Then

Pick the skill for the task (`api-endpoint`, `db-migration`, `dev` (run/restart the stack), `design` (UI)) and see the concept docs under `/docs`. When you touch a convention, update its skill and doc in the same change (`AGENTS.md`).
