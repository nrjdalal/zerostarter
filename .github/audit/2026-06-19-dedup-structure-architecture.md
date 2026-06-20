# Audit: Deduplication, File Structure & Architecture

**Date:** 2026-06-19
**Scope:** Whole monorepo (`api/hono`, `packages/*`, `web/next`, `.github/scripts`, root config).
**Method:** Four parallel read-only deep-dives (lib+app, packages+api, components, scripts+config), then independent verification of every high-value or medium-confidence claim before recording it here. Findings marked ✓ were re-verified by hand.

## Verdict

The architecture is sound. Package layering is clean and acyclic (`env ← db ← auth ← api`), there is no `api`↔`web` leakage, env exports are scoped per-consumer, client/server component boundaries are correct, and no build artifacts are committed. There are **no correctness bugs**. The opportunities are: one real CI gap (`lint` checks nothing), a handful of dead/bypassed files, and several spots where the right abstraction already exists but a caller hand-rolls the logic instead.

## Prioritized actions

| #   | Action                                                                                                                                                                                          | Severity   | Confidence | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ------ |
| 1   | ✅ ~~Make `bun run lint` actually lint (add `lint: oxlint` to each workspace, or point root script at oxlint directly)~~ (done in #481: root `lint` now runs `oxlint`)                          | **medium** | ✓ verified | S      |
| 2   | 🚫 ~~Fix `ui/sonner.tsx`: wire it into `providers.tsx` or delete it~~ (won't fix: kept as shadcn registry surface, like the other intentionally-unused `ui/*` primitives)                       | medium     | ✓ verified | S      |
| 3   | ✅ ~~Remove `overrides.hono` + its AUDIT.md section (verify with clean install)~~ (done in #481: override + AUDIT.md section removed)                                                           | medium     | ✓ verified | S      |
| 4   | ⏭️ Route the home OG route through `renderOgImage` instead of rebuilding the template (deferred to its own PR; parked in `stash@{0}`)                                                           | medium     | ✓ verified | S      |
| 5   | ✅ ~~Resolve the `SidebarTrigger` fork (retire dead shadcn export / `zeroui/` one-file namespace)~~ (done in #481: extended via post-sync generator, `zeroui/` retired)                         | medium     | ✓ verified | S      |
| 6   | ✅ ~~Collapse 3 near-identical `tsdown.config.ts` into a shared factory~~ (done in #481: `@packages/tsconfig`→`@packages/config` + a `definePackageConfig` factory)                             | low        | high       | M      |
| 7   | ✅ ~~`getPublicBlogPage()` helper to replace the 4× blog resolve-and-gate~~ (done in #481: `getPublicBlogPage(slug, now?)` in `lib/blog.ts`, all 4 sites gate through it)                       | medium     | high       | S      |
| 8   | ✅ ~~Shared sidebar dropdown shell for user-menu + org-switcher~~ (done in #484: `SidebarDropdownMenu` shell; consumers supply leading + identity + items)                                      | medium     | high       | M      |
| 9   | 🚫 ~~Stop mirroring `.gitignore` into `.dockerignore` 1:1~~ (won't fix: keep the `.gitignore`/`.dockerignore` mirror in sync; Docker-only divergence not worth it)                              | medium     | high       | S      |
| 10  | 🚫 ~~Remove dead env exports (`isDevelopment`/`isTest`/`isStaging`/`NodeEnv` re-export)~~ (won't fix: kept as intentional env API surface for downstream apps; all 5 checkers verified working) | low        | ✓ verified | S      |
| 11  | ✅ ~~`jsonError()` helper for the 6 hand-written API error envelopes~~ (done in #481: `jsonError(c, status, code, message, extra?)` in `lib/error.ts`, all sites routed through it)             | low        | high       | S      |

---

## 1. Deduplication

### 1.1 OG home route rebuilds the shared image template ✓

`web/next/src/app/og/home/route.tsx:7-48` calls only `renderOgElement` (the raw layer) and hand-rebuilds the same scaffold that `renderOgImage` already owns: identical `linear-gradient(135deg, #000 0%, #1a1a1a 100%)` background (`og-image.tsx:50`), identical title gradient `linear-gradient(90deg, #fff 0%, #a0a0a0 100%)` + `backgroundClip:"text"` (`og-image.tsx:81-82`), identical description block. Only `align` (center vs flex-start) and the missing section label differ. Brand changes must be made twice.
**Fix:** parameterize `renderOgImage` (`align`, optional `label`, `titleFontSize`) and have the home route call it. Closes the architecture gap where `og-image.tsx` exposes a templated layer that one consumer reaches past.

### 1.2 Blog "resolve page + public-gate + notFound" repeated 4× ✓ (pattern)

Same `const page = blogSource.getPage(slug); if (!page || !isPublicBlogPage(page)) notFound()` in:

- `web/next/src/app/(content)/blog/[[...slug]]/page.tsx:18-19` and again `:28-29` (Page + generateMetadata)
- `web/next/src/app/og/blog/[[...slug]]/route.tsx:19-20`
- `web/next/src/app/(llms.txt)/llms.txt/[[...slug]]/route.ts:102-103`

`lib/blog.ts` owns the policy but not this resolve-and-gate step.
**Fix:** add `getPublicBlogPage(slug, now?)` to `lib/blog.ts` (mirrors `getPageData` in `fumadocs.tsx`); call from all four sites.
**Done (#481):** `getPublicBlogPage(slug, now?)` added to `lib/blog.ts`; the Page, `generateMetadata`, OG, and llms.txt sites all call it (the OG route uses it purely as a 404 gate, since it renders from `slug`).

### 1.3 Three `tsdown.config.ts` files are near-identical

`packages/auth/tsdown.config.ts`, `packages/db/tsdown.config.ts`, `api/hono/tsdown.config.ts` share the `getSafeEnv` import, the `defineConfig` array wrapper, `dts.tsgo:true`, `entry:["src/index.ts"]`, `minify:true`, and the identical `hooks["build:prepare"]`. Deltas are tiny (`neverBundle:["bun"]`, `alwaysBundle:[/^@packages\//]`).
**Fix:** a `definePackageConfig({ name, env, deps })` factory (in `@packages/tsconfig` or a new `@packages/tsdown`); each file shrinks to one call. `packages/env/tsdown.config.ts` is genuinely different (multi-entry, version-define) — leave it.

### 1.4 env `runtimeEnv` block restates the schema 1:1 in every file

`packages/env/src/{api-hono,auth,db,web-next}.ts:8-…` each repeat every declared key as `KEY: process.env.KEY`. ~50 lines of pure restatement; the only real logic is `db.ts:14-16` (docker host rewrite) and `web-next.ts:24-29` (SKIP_ENV polyfills).
**Fix:** where the mapping is trivial (`api-hono`, `auth`) pass `runtimeEnv: process.env`; keep explicit mapping only where a transform exists.

### 1.5 Trusted-origins schema + transform duplicated across two env entrypoints

`HONO_APP_URL` (`api-hono.ts:10` & `auth.ts:15`) and the byte-identical `.transform((s) => s.split(",").map((v) => v.trim().replace(/\/$/, "")))` pipeline (`api-hono.ts:14-17` & `auth.ts:16-19`).
**Fix:** extract the origins schema into `env/src/lib/` and import into both, or have `auth` re-export the subset.

### 1.6 Sidebar dropdown shell duplicated (user-menu vs org-switcher)

Identical trigger className (`user-menu.tsx:41`, `org-switcher.tsx:125`), identical content className (`user-menu.tsx:56`, `org-switcher.tsx:143`), and the identity block (`grid flex-1 text-left text-sm leading-tight` + truncated name/secondary) appears 4× (`user-menu.tsx:49,68`, `org-switcher.tsx:132,154`).
**Fix:** extract a `SidebarDropdownMenu` shell (icon/avatar + primary/secondary slots + content wrapper); consumers supply only menu items.
**Done (#484):** `SidebarDropdownMenu` (`components/sidebar/dropdown-menu.tsx`) owns the trigger, the identity header, and the content wrapper (`align`/`mobileSide`); `user-menu` and `org-switcher` pass only `leading`/`primary`/`secondary` + items. Behaviour-preserving — consumer slots keep the per-component deltas (avatar vs icon box, muted secondary, distinct trigger/header fallback text). Verified in-browser: both dropdowns render trigger + identity header + items correctly.

### 1.7 API error envelope hand-written in ~6 places

`{ error: { code, message } }` literal at `index.ts:33` (NOT_FOUND), `index.ts:42` (FORBIDDEN), `middlewares/auth.ts:28` (UNAUTHORIZED), `middlewares/rate-limiter.ts:36` (TOO_MANY_REQUESTS), `routers/agents.ts:17`, plus the central `lib/error.ts:7-18`. No typed helper enforces the shape.
**Fix:** `jsonError(c, status, code, message, extra?)` in `lib/error.ts`; route all inline cases through it.
**Done (#481):** `jsonError` added to `lib/error.ts` (generic on status so the RPC `AppType` is preserved); the 5 inline envelopes (NOT_FOUND, FORBIDDEN, UNAUTHORIZED, TOO_MANY_REQUESTS, AGENTS_LOGIN_FAILED) and both `errorHandler` branches (VALIDATION_ERROR, INTERNAL_SERVER_ERROR) route through it. Verified: check-types green, envelopes byte-identical at runtime.

### 1.8 Lower-value repeats (batch when touching the files)

- llms.txt index-block template repeated (`route.ts:41-59` & `:75-93`) + list mapper (`:38-40` & `:71-73`) → `renderLlmsIndex()` + `toLlmLink()`.
- Blog date extraction twice in `fumadocs.tsx` (`:54-64` footer vs `:133-140` metadata, one uses `toBlogDate`, one raw) → single `getBlogArticle()`.
- `internalUrl || url` API-base selection in `lib/api/client.ts:10` and `(protected)/layout.tsx:21` → one resolved `config.api` value.
- TanStack-Form field boilerplate (`access.tsx:94-116` vs `org-switcher.tsx:208-229`) → `<TextField field=… />`.
- Navbar link loop duplicated desktop/mobile (`navbar/home.tsx:101-129` & `187-219`) → `<NavLink onNavigate?>`.
- Mobile-close helper `const close = () => { if (isMobile) setOpenMobile(false) }` (`console.tsx:37-38`, `docs/content.tsx:34-35`).
- `formatSize` in `build-sizes.ts:23-28` and `compress-images.ts:153-157`.

---

## 2. Dead / orphaned / bypassed code

### 2.1 `ui/sonner.tsx` is customized but never mounted ✓

`providers.tsx:10` imports `Toaster` from the `sonner` package directly (`:36` `<Toaster richColors />`), so the local next-themes-aware wrapper at `ui/sonner.tsx:13-45` is dead.
**Fix:** import `@/components/ui/sonner` in providers (gain theme integration) **or** delete `ui/sonner.tsx`.
**Decision (#481):** won't fix. `ui/sonner.tsx` is kept as shadcn registry surface alongside the other intentionally-unused `ui/*` primitives (see §5); `providers.tsx` keeps the raw `<Toaster richColors />`.

### 2.2 `SidebarTrigger` fork — shadcn export is dead, `zeroui/` is a one-file namespace ✓

The shadcn `SidebarTrigger` (`ui/sidebar.tsx:247-267`) has **0** importers; both call sites (`(content)/docs/layout.tsx:13`, `sidebar/shell.tsx:13`) use `@/components/zeroui/sidebar-trigger`, a hard fork that adds size/children/`variant="secondary"`. The dead shadcn export survives every shadcn re-sync. `zeroui/` holds this one file and overlaps conceptually with `ui/`. A stale `// used at @/app/docs/layout.tsx` comment in the fork is incomplete (also used in shell.tsx).
**Fix:** keep one trigger. Either fold the customizations into the `ui/sidebar.tsx` primitive and delete `zeroui/`, or move the fork into `ui/`/`sidebar/` and retire the `zeroui/` namespace.
**Done (#481):** folded into the `ui/sidebar.tsx` primitive (optional `children` label) and deleted `zeroui/`. The extension is re-applied on every shadcn sync by `.github/scripts/shadcn-customize.ts` (idempotent, asserts each transform) so it survives re-syncs instead of being a dead fork; the floating/edge-tab behavior moved to `sidebar/floating-trigger.tsx`.

### 2.3 Dead env exports ✓

`isDevelopment`, `isTest`, `isStaging` (constants.ts:33-35, re-exported index.ts:9-11) have **0** external usages; only `isLocal`/`isProduction` are consumed. The `NodeEnv` re-export (index.ts:13) has 0 external consumers (the type is still needed internally by `createEnvChecker`). `VERSION`/`GIT_SHA` re-exports (index.ts:3-4) also look unused vs `BUILD_VERSION`/`getBuildVersion`.
**Fix:** drop the unused `is*` checkers + `NodeEnv`/`VERSION`/`GIT_SHA` re-exports, **or** explicitly document them as intentional starter API surface.
**Decision (#481): won't fix.** Kept as intentional starter API surface. The starter itself uses only `isLocal`/`isProduction`, but the five env checkers are one cohesive `createEnvChecker` set and `VERSION`/`GIT_SHA`/`NodeEnv` round out the version + type API for downstream apps. They are inert until used (verified: all five checkers return correctly per env), so cutting them would only yield a partial, asymmetric API.

### 2.4 `import "@/lib/utils"` side-effect import is opaque

`packages/env/src/{api-hono,auth,db,web-next}.ts:4` do a bare side-effect import purely to trigger dotenv `config()` in `lib/utils.ts:7-22`, while also importing `getSafeEnv` from elsewhere. Relies on import ordering.
**Fix:** split the loader into `@/lib/load-env` (clear side-effect name) or export an explicit `loadEnv()`.

---

## 3. Build & CI pipeline

### 3.1 `bun run lint` lints nothing ✓ — the standout

`turbo.json:20` defines `lint: {}`, `package.json:33` runs `turbo run lint`, but **no workspace defines a `lint` script** (verified across all 6 package.json files). `auto-check-build.yml:30` runs `bun run lint` in CI, so CI reports lint success while linting zero files. Actual linting only happens via oxlint on _staged_ files locally (`.lintstagedrc.json:2`).
**Fix:** add `"lint": "oxlint"` to each workspace so CI lints, or replace the root script with a direct `oxlint` and drop the empty turbo task.

### 3.2 `.dockerignore` is a 1:1 clone of `.gitignore`

Byte-identical except the header comment (`.dockerignore:59`). It excludes none of what a build context should: `.git/`, `.github/` (minus `scripts`), `.agents/`, `.claude/`, `*.md`, `CHANGELOG.md`, `AUDIT.md`. Both Dockerfiles `COPY . .` in the prune stage (`*/Dockerfile:6`), so git history + all agent tooling ship into the build context.
**Fix:** give `.dockerignore` Docker-specific excludes (re-include `!.github/scripts`, which the prepare stage needs at `*/Dockerfile:10`). Note: the `ignore-sync` skill currently enforces the 1:1 mirror — that skill's contract needs revisiting, not just the file.
**Decision (#481): won't fix.** `.dockerignore` stays a 1:1 mirror of `.gitignore` (the `ignore-sync` invariant). Diverging the files for Docker-only excludes is not worth it: the savings are marginal (~14 MB `.git` + agent tooling), and excluding `.git` drops the baked sha from a Docker `BUILD_VERSION` (`getGitSha` falls back to `""`). The `.github/*` + `!.github/scripts` re-include is itself a standard pattern; the call is about keeping the two files in sync, not feasibility.

### 3.3 Bun `1.3.10` pinned in 5 places that must move together

Both Dockerfiles (`:2`), both `vercel.json` (`api/hono/vercel.json:7`, `web/next/vercel.json:6`), and `package.json:65` (`packageManager`). A bump silently drifts if one is missed.
**Fix:** treat it as one logical constant — document the sync points in the `docker-test` skill, or source a build ARG from `packageManager`.

### 3.4 `.github/scripts/tsconfig.json` can't really type-check cross-package imports

`tsconfig.json:6` sets `types:["bun"]` only; `docs.ts:5-12` imports from `web/next/...` and `compress-images.ts` uses `node:path`. `check-types:scripts` runs but resolves these loosely.
**Fix:** add `@types/node` to `types`; confirm the `docs.ts` web imports resolve. Low risk (the real next/fumadocs build catches breakage).

---

## 4. Architecture

### 4.1 Protected layout makes a raw cross-service `fetch` instead of the typed RPC client

`(protected)/layout.tsx:21-28` hand-builds the auth URL and `fetch()`s `…/api/auth/organization/set-active` with manually-forwarded headers — the one place that breaks the repo's own "use `apiClient`, not `fetch`" convention.
**Fix:** route through `apiClient`/`authClient` (verify better-auth exposes `organization.setActive` on the RPC surface); also removes the duplicated API-base selection (1.8).

### 4.2 `auth/index.ts` uses the typed RPC client in an untyped way

`lib/auth/index.ts:8-20` calls the RPC client then does `response.text()` + manual `JSON.parse(...) as Session`, sidestepping the typed `.json()`.
**Fix:** use the typed `.json()` where the route response type allows; keep the try/catch → null.

### 4.3 Two-tier rate limiting is implicit

Global IP limiter on `*` (`index.ts:18-30`) then a second per-user limiter (`limit*2`) hand-invoked at the end of `authMiddleware` (`middlewares/auth.ts:34`). Authed `/v1/*` requests pass through both buckets; plausibly intentional but undocumented and double-counts.
**Fix:** document the two-tier intent, or compose the user limiter as a normal `.use()` on `v1Router` instead of manual invocation.

### 4.4 `packages/config/tsconfig.json` ships DOM/JSX libs to backend packages

`tsconfig.json:5` (`lib:["dom","dom.iterable","esnext"]`) + `:14` (`jsx:"react-jsx"`) are inherited by `db`/`auth`/`env`/`api`, none of which render React DOM (api overrides to `hono/jsx`). A backend file could reference `window` without a compile error.
**Fix (optional):** split into `base.json` (server-safe) + `react.json` (extends base, adds DOM + react-jsx); web extends the latter.

### 4.5 Docs sidebar is a second shell

`(content)/docs/layout.tsx:18-53` hand-wires `SidebarProvider`/`Sidebar`/chrome instead of using `SidebarShell` (`shell.tsx`, used by console + dashboard). Justified by docs' `collapsible="offcanvas"` + no cookie state + trigger-in-`main`, but chrome fixes must be made in two places.
**Fix (optional):** generalize `SidebarShell` with `collapsible`/`brand`/trigger-placement props, or document docs as a deliberate second shell.

---

## 5. What's already clean (no action)

- **Package layering** is acyclic and correct: `env ← db ← auth ← api`; no `api`↔`web` cross-imports; `web` consumes only `@packages/env`.
- **Scoped env exports** — `package.json` `exports` map enforces per-consumer subsets (`@packages/env/db`, `/auth`, `/api-hono`, `/web-next`); the per-app split is a real abstraction, not copy-paste.
- **All tsconfigs** correctly extend `@packages/config/tsconfig.json` with no duplicated compilerOptions.
- **The three `lib/utils.ts`** (auth, env, web) share only a filename — content is fully disjoint. Not a dup.
- **Console access policy** centralized in `lib/auth/console.ts`, consumed by both the console layout and the gated search route — no duplicated rule.
- **Client/server boundaries** correct: session read server-side in layouts and passed as `user` prop; `authClient.useSession` used only where reactive client state is genuinely needed (navbar toggle, live org list).
- **No committed build artifacts** — `.turbo/`, `.vercel/`, `.source/`, `dist/`, `bundle/`, `vercel-bundle/`, `*.tsbuildinfo` all gitignored and untracked.
- **`overrides.esbuild` is still required** — `drizzle-kit@0.31.10` (latest) still pins `esbuild ^0.25.4`; keep the override per AUDIT.md exit criteria.
- **No orphaned scripts** — all 8 `.github/scripts/*` have confirmed invocation sites. The 35 "unused" `ui/*` shadcn primitives are intentional registry surface kept by the `shadcn-sync` skill, not accidental dead code (the only one that matters is `ui/sonner.tsx`, 2.1).
- **Release/changelog flow** (`auto-canary-into-main` → `auto-release` → `changelogen`/`changelog-manager.ts`) is consistent with no redundancy; the `ci:false` + bullet-content gate correctly skips empty releases.

---

## Notes on cross-cutting items already tracked in memory

- The two-instance docs system (`content/docs` + `content/console/docs`, two search routes, two layouts) is an intentional demo of multi-instance fumadocs, not accidental duplication.
- `?t=${Date.now()}` on OG URLs is a deliberate cache-buster — not flagged.
- `blog-policy.ts` unit tests are a deliberate deferral — not flagged.
