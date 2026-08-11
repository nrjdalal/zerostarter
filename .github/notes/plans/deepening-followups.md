# Deepening follow-ups from PR #797

- Status: backlog
- Links: PR #797 (landed the first pass); 2026-07-12 architecture review (deep-module lens)

Four items scoped during #797 and deliberately left out of it. Each is independent; none blocks the others.

## 1. Move the build-chain scripts into `packages/scripts`

`docs.ts`, `compress-images.ts`, `migrate-on-deploy.ts` and `portless.ts` (488 lines) sit in `.github/scripts/` but are invoked by a build: the first two by `web/next`'s `build` script, the third by `api/hono/vercel.json`'s build command, the fourth by both dev commands. Because they are not a workspace package, both Dockerfiles carry `COPY --from=prepare /app/.github/scripts .github/scripts`, which pulls all 1,318 lines past `turbo prune`.

Moving them deletes both COPY lines, puts `sharp` and `svgo` on the package that uses them rather than the root, brings them under `turbo.json`'s `globalDependencies`, and makes them importable, which is the precondition for testing them. #797 fixed the convention this depends on (AGENTS.md and `add-package/SKILL.md` contradicted each other), so placement is now unambiguous.

**Why it was not done in #797:** it needs a Docker build to verify, and shipping it unverified was not worth it.

## 2. Point the package tests at the `exports` map

`tests/packages/auth/src/access.test.ts` and `tests/packages/db/src/console.test.ts` import their subject by relative source path, so the `exports` map, which is what `api/hono` and `web/next` actually resolve, is never exercised. Drop the `./access` subpath and 330 tests stay green while both apps fail to build.

Not a one-line change: `@packages/auth/access` does not resolve from `tests/` (no `node_modules/@packages` symlink, and `tests/` is not a workspace member). Making it work needs either root `@packages/*` devDependencies or a `tests` workspace, and `tests/` is fork-excluded, so a fork would carry dependencies for a directory it does not have. That trade-off is the decision to make.

## 3. Declare the `SessionReader` seam

Two adapters already exist: `api/hono/src/middlewares/auth.ts` uses the real Better Auth instance, and `web/next/src/lib/auth/index.ts` hand-rolls a structural look-alike because it cannot import the instance without dragging in the database driver. The web one conforms by naming its object `auth` and casting the parsed body, so nothing type-checks that the two agree.

Two adapters means the seam is real. Declaring a `SessionReader` interface in `@packages/auth/access`, which has no runtime dependencies and is already imported by both apps, would make drift a type error and let a third in-memory adapter exist, which is what would unlock route tests.

## 4. Derive the SQL role ladder from `CONSOLE_ROLES`

`packages/auth/src/access.ts` opens by warning that "a second comparison written inline is how a lower rung quietly gains a power". The ladder is restated four more times in SQL: `admin/users.ts`'s `sql.raw` CASE (which hardcodes `"user"."role"` as a string, so a column rename compiles green and fails at runtime), its `isNull`/`notInArray` predicate re-deriving the unrecognised-reads-as-user rule, the `coalesce(banned, false)` sort expression, and `.github/scripts/console-roles.ts`, which restates the ladder because it cannot import the package from the repo root and is held honest only by a regex-on-source test.

Both 3 and 4 change auth-shaped structure and want a design pass before code.
