# Auth cookie derivation from a build-generated tldts breakdown

**Status:** in progress on `feat/tldts-cookie-domain` (PR #723).

**Scope:** canary only. Independent of the `feat/split-deploy-auth` branch; the `isPrivate` signal is computed from tldts's PSL, not that branch's curated set.

**Not split-deploy:** `SameSite=None` on a hosting suffix only sets cookie attributes. Safari blocks third-party cookies, so a `*.vercel.app` deploy of this branch alone still cannot complete cross-origin OAuth without that branch's nonce handoff (`skipStateCookieCheck`). `isPrivate` mode is not "split-deploy solved".

## Problem

On canary the auth cookie values come from two functions in `packages/auth/src/lib/utils.ts` that hand-roll `split(".")` index math on `HONO_APP_URL`. That misses multi-level public suffixes (`co.uk`, `com.au`) and private hosting suffixes (`vercel.app`), which genuinely need the Public Suffix List. Bundling tldts to parse one host at boot, however, adds ~125 KB (its full PSL) to the api server bundle.

## Approach

Run tldts **once at build time in a dedicated scripts package**, write the small result, and bake only that into auth.

- **`@packages/scripts`** is a new private workspace package for app-build tooling. Nothing imports it at runtime, so it never ships. It follows the same shape as the other `packages/*` (source under `src/`, `tsconfig.json` extends `@packages/config/tsconfig.json`, `check-types` runs `tsc --noEmit`), and owns `src/generate-tldts.ts` plus its `@packages/config` + `@packages/env` + `tldts` devDependencies. The script reads `env.HONO_APP_URL` from `@packages/env` (reusing its env loading, no separate dotenv), runs `parse(url, { allowPrivateDomains: true })`, and writes the repo-root `.generated/tldts.json` (gitignored). `.github/scripts` stays for CI/repo tooling only.
- **`@packages/auth` build runs it first:** `"build": "bun ../scripts/src/generate-tldts.ts && tsdown"`, and declares `@packages/scripts` as a devDependency so `turbo prune` keeps it in the Docker build.
- **`@packages/auth/tsdown.config.ts`** reads that JSON and injects it via tsdown `define` as `__DERIVED_TLDTS__`. `definePackageConfig` gained an optional `define` passthrough for this (harmless to db/api).
- **`@packages/auth/src/index.ts`** reads the ambient constant directly and runs one `cookieConfig(tldts)` → `{ cookieDomain, cookiePrefix, isPrivate }`; the `advanced` block switches cookie mode on `isPrivate`.

`@packages/env` stays plain: just `createEnv(...)`, no `derived` pass-through. The runtime carries only the ~200-byte parse result, and `co.uk`/`vercel.app` are fully correct because the real PSL runs in the script (e.g. `api.example.co.uk` → `cookieDomain: ".example.co.uk"`, `cookiePrefix: undefined`).

### Why a scripts package (not the tsdown config, not env, not .github/scripts)

- Loading env inside a build config is a bad smell, and the tsdown config loader can't cleanly import the runtime's loader.
- The generated value has one consumer (auth), so it belongs in auth, not routed through an `env.derived` export.
- A repo-level `.github/scripts` file can't resolve workspace-scoped deps cleanly and mixes CI tooling with app-build tooling. A workspace package resolves `@packages/env` + `tldts`, is never bundled, and keeps build-only deps off the root.

### Build-time env + trade-off

`generate-tldts.ts` reads `HONO_APP_URL` from `@packages/env`, which loads it the same dual way at build: `process.env` on Vercel (build env), or the `.env` the Docker build mounts as a required secret (env's own dotenv). Cache-invalidation covers both sources: `turbo.json` lists `HONO_APP_URL` in `globalEnv` (catches the process-env case) plus `.env*` in `globalDependencies`, so a changed URL, whether in `.env` or an `.env.<mode>` override (the env package loads `.env.${NODE_ENV}` with `override: true`), re-hashes the build even when it lives only in a file (local/Docker). It stays global rather than scoped to `@packages/auth#build` because `.env` also feeds web's baked `NEXT_PUBLIC_*`; a repo-wide re-hash on the rare `.env` edit is simpler and can't silently miss a future env-baking build. A generator change is already caught by turbo's workspace graph (auth depends on `@packages/scripts`, so its source feeds auth's build hash), verified with a cache-miss test, so it needs no global entry. Docker's own layer cache is separate: BuildKit excludes the mounted `.env` secret from its cache key, so a `.env` change needs `docker compose build --no-cache` (called out in the Docker guide). Trade-off: the artifact's cookie config is baked to the build-time `HONO_APP_URL`, as the web already bakes `NEXT_PUBLIC_*`; the standard flows match (Vercel per-deploy, docker-compose shares one `.env`).

### Where generated assets live: `.generated/`

The breakdown is written to a single repo-root `.generated/tldts.json`, not to a file inside `@packages/auth`. Generated, disposable artifacts that the build consumes but that are not final build outputs get one centralized, gitignored home rather than scattering `*.generated.*` files across packages.

Name choice, against common web/monorepo conventions:

- **Dot-prefixed** to match the repo's existing tool-managed, gitignored dirs (`.next`, `.source`, `.turbo`), signalling "generated, not hand-edited, safe to delete."
- **`generated` over `.cache`** because the contents are a required build input regenerated on every build, not a performance cache that is safe to blow away for only a speed cost. Calling it a cache would mislead.
- A no-dot **`generated/`** was rejected: that convention usually denotes _committed_ codegen, the opposite of a gitignored throwaway.

`.generated/` is gitignored and dockerignored as a directory, and `bun run clean` (`.github/scripts/clean.sh`) removes it. The script now covers the build-generated set (was missing `.generated`, `vercel-bundle`, `coverage`, `.playwright-cli`, the generated `meta.json`, and `.d.ts`) and leaves user config and secrets alone (`.env*`, `.npmrc`, `.vercel`, and unused `out/`/`build/`).

## Changes

Relative to `canary`:

- **New** `packages/scripts/` (`package.json`, `tsconfig.json`, `src/generate-tldts.ts`), a build-only workspace package that mirrors the standard `packages/*` shape (extends the shared `@packages/config/tsconfig.json`, `src/` layout), with `types: ["bun"]` pinned for the Bun-script entry, matching `packages/cli` (the repo's other Bun package) and `.github/scripts/tsconfig.json`.
- `tldts` added to the root catalog and to `@packages/scripts` devDependencies (alongside `@packages/config`, `@packages/env`, `@types/bun`, `@types/node`, `typescript`); `dotenv` is unchanged (an existing `@packages/env` dependency the script reuses through the env package).
- `packages/config/tsdown.ts`: `definePackageConfig` gains an optional `define`.
- `turbo.json`: `.env*` added to `globalDependencies` so the auth (and web `NEXT_PUBLIC_*`) build cache invalidates on any env-file change including `.env.<mode>` overrides (`globalEnv` alone only sees `process.env`; a generator change is already caught via the `@packages/scripts` workspace dependency).
- `@packages/auth`: build runs `generate-tldts` first (with `@packages/scripts` as a devDep); `tsdown.config.ts` inlines the JSON via `define`; `index.ts` reads the ambient `ParsedHost`; the hand-rolled `getCookieDomain`/`getCookiePrefix` collapse into one `cookieConfig` plus the `isPrivate` cookie-mode switch.
- `@packages/env` is untouched (plain `createEnv`).
- Generated output centralized at repo-root `.generated/tldts.json`; `.generated/` added to `.gitignore`, `.dockerignore`, and `.github/scripts/clean.sh` (which is also brought up to date with the rest of the generated set).

## Behavior

Custom-domain and `.localhost` hosts unchanged. Hosting suffixes (`vercel.app`, `pages.dev`, `github.io`) → `cookieDomain: undefined` (host-only) + `SameSite=None`, where canary emitted the browser-rejected `.vercel.app`. ccTLD apex → host-only; IP literals → host-only. A host with no shareable parent (apex API URL, bare `localhost`, IP) keeps the `cookieDomain &&` guard, so Better Auth stays host-only rather than widening to `Domain=<hostname>`.

## Verification

- Full turbo build (all 8 packages) + `check-types` (incl. `@packages/scripts`) green; `bun test` in `@packages/auth` passes (cookieConfig). `@packages/env/dist/auth.mjs` clean (no `derived`, no tldts); `@packages/auth/dist/index.mjs` carries only the baked breakdown; api bundle **1.43 MB** (canary size, no PSL).
- Script sourcing verified: with `HONO_APP_URL` only in a `.env` file (shell var unset), the script wrote the correct `api.zerostarter.dev` breakdown and it baked into `auth/dist`.
- `packages/auth/test/utils.test.ts` covers `cookieConfig` across production subdomains, `.localhost` (main + worktree), ccTLD apex/subdomain, hosting suffixes, IPs, and the null-host fallback.

## Doc-sync

- `.env.example` unchanged: `HONO_APP_URL` already documented; the breakdown is generated from it.
