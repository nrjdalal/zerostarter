---
name: codebase-map
description: "Orient in this repo: which file to edit for a change, how a change ripples across the stack, and how to search the code. Use at the start of a task in an unfamiliar area, or before a cross-cutting change."
source: local
---

# Codebase Map

One Bun + Turborepo monorepo: two deployable apps over shared packages. Imports use `@api/hono`, `@packages/*`, and the `@/` alias.

```
.generated/       # repo-root home for build-time generated assets (gitignored)
api/hono/         # backend (Hono): routers, middlewares, the AppType export
web/next/         # frontend (Next.js App Router): app/, components/, lib/, content/
packages/auth/    # Better Auth instance
packages/db/      # Drizzle schema + client
packages/env/     # type-safe env, one validated entry per consumer
packages/config/  # TS base, tsdown factory, and site.ts (brand identity)
packages/scripts/ # build-only bun tooling (auth-schema, data-table-metrics, generate-env, release-version); every new script lands here, never bundled
packages/cli/     # the zerostarter scaffolding CLI (canonical repo only; init strips it)
tests/            # the whole suite, mirroring each subject's path; *.e2e.test.ts drive a running stack (canonical repo only; forks take no tests)
```

Read `AGENTS.md` first for the rules; `curl "$(bunx portless get zerostarter)/llms-full.txt"` dumps the docs and published posts as one context file.

## Where to edit for X

| Goal | Edit here | Then |
| --- | --- | --- |
| Add/change an API route | `api/hono/src/routers/<name>.ts`, wired through `routers/index.ts` and the `.route()` chain in `src/index.ts` | `api-endpoint` skill |
| Change the database schema | `packages/db/src/schema/<name>.ts` → export from `schema/index.ts`; `auth.ts` is generated, see the row below | `db-migration` skill |
| Add/change a page | `web/next/src/app/`, route groups: `(console)` member and above at its layout (the Gate by role row says what that leaves open), `(content)` docs+blog, `(llms.txt)` the plain-text mirrors, `(protected)` dashboard. The public home is `app/page.tsx` in a fork; in the canonical starter it is the `(marketing)` group, with `/hire` and `/resume` | - |
| Add/customize a UI component | `web/next/src/components/`: `ui/` is generated shadcn, customized through the post-sync script | `design`, `shadcn-sync` skills |
| Call the API from the web app | `web/next/src/lib/api/client.ts` (`apiClient`, `unwrap`) | - |
| Rebrand (name, description, socials) | `packages/config/src/site.ts` for what the app shows; both apps read its built `dist`, so a running `bun run dev` shows an edit only after a restart. A fork's portless hosts (`portless.name` in `web/next/package.json` and `api/hono/package.json`), skills and `AGENTS.md` follow the root `package.json` `name` instead: every `sync` rewrites them from it, so a fork renamed by hand keeps its old hosts until the next `sync` or until those two fields are edited | - |
| Add or read an env var | `packages/env/src/{api-hono,auth,db,web-next}.ts`, read through `@packages/env/*`. The root `.env` is loaded by `src/load-dotenv.ts`, relative to the working directory: the server targets import it first, and `web-next` and the package index never do, since client components import them, so a script that reads env through either imports `@packages/env/load-dotenv` itself first, as `packages/scripts/src/generate-env.ts` does. A variable the platform or Next injects (`NEXT_PHASE`, `PORT`, `VERCEL`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_*`) is read from `process.env` at the point of use and stays out of the schema and `.env.example`, and so is `NEXT_PUBLIC_IS_PRIVATE`, which `next.config.ts` inlines from `generate-env.ts` output | - |
| Configure auth (providers, cookies, hooks) | `packages/auth/src/index.ts` | - |
| Add or change an auth plugin, or a column on `user`/`session` | `packages/auth/src/schema.ts` (`user.additionalFields` for a `user` column; a `session` column takes the extra step in `db-migration`) → `bun run auth:schema` regenerates `packages/db/src/schema/auth.ts`; a plugin's new table also joins the hand-written `schema` map passed to `drizzleAdapter` in `packages/auth/src/index.ts` | `db-migration` skill |
| Add a data table | colocate `data-columns.tsx` + `data-table.tsx` in the page's `components/` folder, composing `web/next/src/components/data-table.tsx` (reference: `(console)/console/(access)/users/`) | `design` skill |
| Add a test (canonical starter only) | `tests/<path of the file under test>.test.ts`, mirroring the subject's path; `bun run test` builds `packages/*` first, since a test reaches a package through its `exports`, which point at `dist`. `bun test` skips dot-directories, which is why `.github/scripts` tests live under `tests/github/scripts/`. An end-to-end test is `tests/<path of the router or page it drives>.e2e.test.ts` on the `tests/stack.ts` helper, run against a stack by `bun run test:e2e` | `docker-test` skill |
| Add a build or tooling script | `packages/scripts/src/<name>.ts`, with its deps on that package; output to `.generated/` | `add-package` skill |
| Gate by role | the ladder and every access decision live in `packages/auth/src/access.ts` (pure, unit-tested in the canonical starter, imported as `@packages/auth/access`), and `bun run console:roles` restates the grantable rungs in `.github/scripts/console-roles.ts`, so a new rung lands in both; `assertConsoleAccess` in `web/next/src/lib/auth/console.ts` is the page check, which the console layout calls at member and each admin page calls again at admin. Next does not re-render a shared layout on a client navigation between the pages under it, nor for a request whose `Next-Router-State-Tree` header, which any client can send, claims the layout is already on screen, so a page that must stay private calls it itself. The console docs pages do not, so anyone who knows their paths can read them, signed in or not. `api/hono/src/middlewares/console.ts` requires admin for the whole console router via `requireConsoleRole` | - |
| Change the error/response shape | `api/hono/src/lib/error.ts` (the `{ error: { code, message } }` handler) | - |
| Change docs structure/sidebar | `web/next/docs.config.ts`, single source; `meta.json` is generated | - |

## Trace a feature across the stack

Types flow downhill, so a change ripples predictably:

```
packages/db/src/schema  →  api/hono/src/routers  →  api/hono/src/index.ts (AppType)  →  web/next/src/lib/api/client.ts  →  app / components
```

To add a field end to end: edit and migrate the schema, then select and return it in the router. Every `apiClient` call site is retyped automatically, and the compiler becomes your worklist of what still must change.

## Entry points (read these first)

- `api/hono/src/index.ts`, the `.route()` chain and `export type AppType`, the whole API shape in one file.
- `web/next/src/app/layout.tsx`, the web root.
- `packages/config/src/site.ts`, brand identity and injectable content.

## Fast find

```bash
rg -n "\.route\(" api/hono/src/index.ts               # every mounted router
rg -n "export const \w+Router" api/hono/src/routers   # every router definition
ls packages/db/src/schema                             # every schema file (tables)
rg -n "apiClient\." web/next/src                      # every API call site
rg -n "SOME_ENV_VAR" packages/env                     # where an env var is declared
ls .agents/skills                                     # every task skill available
```

## Then

Load the task skill (the table's right column); `dev` runs and restarts the stack. In the canonical starter, concept docs live under `/docs`; a fork's `/docs` holds its own.
