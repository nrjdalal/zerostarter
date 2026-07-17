# Requirements: build-time deploy-mode detection

Status: implemented on `feat/build-time-deploy-mode` (#721; PR pending). Branch: `feat/build-time-deploy-mode` (off `canary`).
Supersedes the detection half of PR #720; is a **rewrite**, not a diff on top of it.
Context and design trail: #719 (umbrella), #720 (the runtime-detection version), Icebox #707.

This document is the single source of truth for two independent spec/implementation passes.
It states _what_ must be true and _which decisions are already locked_; it deliberately leaves
the last mile of mechanics to the implementer except where a decision is called out as locked.

---

## Problem statement

The template ships two deployable apps (`web/next`, `api/hono`). An operator can deploy them as
two separate projects on a shared public hosting suffix (two `*.vercel.app` projects, `*.netlify.app`,
`*.pages.dev`, and friends), or as two different custom domains, or as subdomains of one domain, or
as one shared domain. Cookie-based auth only works out of the box in the shared-domain shapes. In the
others the OAuth state cookie is rejected at storage (a `Domain=.vercel.app` cookie is a public-suffix
cookie the browser drops; host-only it arrives `SameSite=Lax` on a cross-site response), and sign-in
dies with `state_mismatch` on the operator's very first deploy.

PR #720 solved this, and its solution is **field-verified end to end on a live two-project
`*.vercel.app` pair (`studiozero-web` / `studiozero-api`), including a real GitHub sign-in in Safari
with Prevent Cross-Site Tracking on**. But #720 detects which shape it is in **at runtime**, by string-
matching the request/config host against a **hand-curated list of public hosting suffixes**
(`PUBLIC_HOSTING_SUFFIXES`), and it parks those detection primitives in `packages/config`, which is the
wrong home (config is build-tooling + brand identity, not runtime auth behavior). Two problems follow:

1. **The curated suffix list is a maintenance liability and is wrong the moment a new suffix appears.**
   The correct source of truth is the Public Suffix List (PSL). A real PSL library (`tldts`) answers
   "is this host on a public suffix / what is its registrable domain" correctly and forever, but it is
   too heavy to want on the hot path of every request, and nobody wants a PSL dependency shipping in the
   client bundle.
2. **The detection primitives live in the wrong package**, and the mode is recomputed at runtime when
   it is a static property of the deployment that is fully known at build time.

## Solution

Resolve the deployment shape **exactly once, at build time**, with a real PSL (`tldts`), and **bake the
result in as a literal** that both bundles read at runtime. Runtime code branches on a constant; no
runtime module ever imports `tldts`; the client bundle and the api bundle both ship zero PSL code.

The proven runtime behavior of #720 (the cross-origin session handoff, the nonce binding, the
`skipStateCookieCheck` split path, the `SameSite=None` split cookies) is **carried over intact** —
it is verified and must not be redesigned. What changes is (a) _how the mode is detected_ (build-time
`tldts` instead of runtime string-match), (b) _how wide the split trigger is_ (any pair that cannot
share a cookie domain, not only "api sits on a public suffix"), and (c) _where the code lives_
(`packages/env` owns detection + the baked value; `packages/auth` owns the runtime behavior;
`packages/config` hosts none of it).

The operator experience is unchanged: same env vars, no new required config, no secrets on the web app,
works on free-tier suffixes and custom domains alike, one deploy shape.

---

## Locked decisions

These were decided with the maintainer and are **not open** for the spec to relitigate:

- **L1. Placement: env = value, auth = behavior.** `packages/env` owns the build-time detector and
  exposes the baked `DEPLOY_MODE` as one more validated env value (its exact charter). `packages/auth`
  owns all runtime behavior keyed on that value and the handoff mechanics. `packages/config` hosts
  **no** deploy logic (it stays clean — on `canary` `config/src` is only `site.ts`, and it must stay
  that way; the `deploy.ts` #720 added to config is not ported).
- **L2. Trigger width: wide.** The handoff activates whenever the web origin and the api origin
  **cannot share a cookie domain** (they have no common registrable domain, per `tldts`), which
  includes both "api on a public suffix" _and_ "two different custom domains on different parents".
  #720's narrower "api sits on a public suffix" trigger only boot-warned about the two-custom-domain
  case; the wide trigger closes that gap. Cost is ~zero because we already run `tldts` at build.
  Caveat to record in the PR: only the public-suffix pair is field-verified; the two-custom-domain
  arm is logically correct but not yet live-tested (see Testing).
- **L3. `tldts` is a dev-only dependency, everywhere it appears, and must never enter a shipped
  bundle.** This is the north-star invariant and must be enforced by an automated check (see Testing).
- **L4. Dev is never split.** Portless local dev serves web and api as subdomains of one
  `.localhost` parent (shared-domain). `resolveDeployMode` short-circuits `localhost`/`.localhost`
  hosts to `shared` without consulting `tldts`. Dev therefore never needs `tldts` and never takes the
  split path.

---

## User stories

1. As an operator deploying the template as two `*.vercel.app` projects, I want sign-in to work on my
   first deploy with no extra configuration, so that the "deploy in five minutes" promise holds without
   a custom domain.
2. As an operator deploying to two different custom domains (e.g. `app.acme.com` + `api.othervendor.io`),
   I want sign-in to work, so that a split-vendor topology is not a silent auth failure.
3. As an operator on a shared domain or subdomains of one domain, I want the exact same behavior and
   performance as today, so that the common path is provably a zero-regression.
4. As an end user, I want to sign in successfully in Safari and Firefox (not only Chrome), so that
   cross-site-cookie-blocking browsers are not broken.
5. As a maintainer, I never want to hand-edit a list of hosting suffixes again, so that a newly launched
   platform suffix does not silently break detection.
6. As a maintainer, I want zero PSL code in either shipped bundle and no per-request PSL work, so that
   the correctness win carries no runtime weight.
7. As a maintainer, I want the deploy shape decided in one place at build and read as a constant
   everywhere, so that the behavior is auditable and cannot drift between the client and the api.
8. As an AI implementer, I want the verified handoff/nonce/`skipStateCookieCheck` behavior specified as
   "port, do not redesign", so that I preserve the field-tested security posture exactly.

---

## Implementation decisions

> **AMENDED during implementation (maintainer call): bake facts, not decisions.** The api build bakes
> only the Public Suffix List facts (`COOKIE_DOMAIN` + `COOKIE_DOMAIN_PUBLIC_SUFFIX`, resolved by
> `@packages/env/deploy`); the same-or-cross decision runs at boot in `@packages/auth/deploy` (pure,
> client-safe), so an env change takes effect on restart with no rebuild, and the baked-decision
> mismatch/downgrade machinery this spec described became unnecessary. The web build bakes the
> decision itself (`NEXT_PUBLIC_DEPLOY_MODE`) using the same `resolveDeployMode` function, since the
> browser has no runtime env. Mode outcomes are identical to the matrix below; only where each half
> computes moved. The sections that follow are the pre-amendment design, kept as the review trail.

### Current state on `canary` (the base this builds on)

- `packages/env/src/`: per-consumer entries `web-next.ts`, `api-hono.ts`, `auth.ts`, `db.ts`, an
  `index.ts` (exports `getSafeEnv`), and `lib/`. Runtime env is validated per consumer.
- `packages/auth/src/`: `index.ts` (the Better Auth instance) and `lib/utils.ts` (currently
  `getCookieDomain`/`getCookiePrefix`, including the `.localhost` carve-out from #715). No deploy-mode
  tri-state on canary; that is a #720 concept being reintroduced build-time-native here.
- `packages/config/src/`: only `site.ts`. The `tsdown` factory `definePackageConfig` is exported from
  `@packages/config/tsdown` and is what `api/hono/tsdown.config.ts` calls.
- `web/next/next.config.ts` already imports `@packages/env` (`getSafeEnv`, `env`).
- `api/hono/tsdown.config.ts` already imports `@packages/env` and calls `definePackageConfig`.

None of #720's split code (`config/src/deploy.ts`, `api/.../handoff.ts`, `web/.../api/handoff/route.ts`,
the `resolveDeployMode` tri-state in auth) exists on canary. The verified versions of those files live
on the #720 branch and are the **source to port from** (see "Port, replace, new" below).

### The deploy mode

One canonical tri-state enum, defined once and shared by type across build and runtime:

```
DeployMode = "shared" | "host-only" | "split"
```

- **shared** — web and api share a registrable domain (custom domain + subdomains, or dev `.localhost`).
  Behavior: today's `crossSubDomainCookies` path, byte-identical, `Lax` untouched.
- **host-only** — a bare host / unresolvable shape where no cookie domain can be asserted. Today's
  fallback, unchanged.
- **split** — web and api cannot share a cookie domain (no common registrable domain; includes
  "api on a public suffix" and "two different custom domains"). Behavior: host-only `SameSite=None`
  cookies + the nonce-bound single-use session handoff + `account.skipStateCookieCheck: true`.

### L1 concrete split (the proposed env/auth division)

**`packages/env` — owns detection + the value.**

- New **build-only** module `packages/env/src/deploy.ts`, exporting:
  - `type DeployMode` (canonical; re-exported for runtime typing).
  - `resolveDeployMode(webUrl: string, apiUrl: string): DeployMode` — pure, uses `tldts`
    (`getDomain` / `getPublicSuffix`):
    - either host is `localhost` or a `*.localhost` host → `shared` (dev; `tldts` not consulted). [L4]
    - both resolve to the **same** registrable domain → `shared`.
    - they resolve to **different** registrable domains, or either host sits **directly on a public
      suffix** (no registrable domain) → `split`. [L2, wide]
    - a URL is unparseable / a bare host with no suffix → `host-only`.
  - `resolveSharedCookieDomain(webUrl: string): string | undefined` — the `.registrable.tld`
    (or `.zerostarter.localhost` in dev) to bake for shared mode, so runtime never derives it from the
    request host with PSL logic.
- `tldts` is added as a **devDependency of `packages/env`**.
- **Isolation rule:** `deploy.ts` is imported **only** by build tooling (`next.config.ts`,
  `tsdown.config.ts`). No runtime entry (`web-next.ts`, `api-hono.ts`, `auth.ts`, `index.ts`) may import
  it, so `tldts` is never in a runtime module graph. [L3]
- **Runtime exposure:** `web-next.ts` validates `NEXT_PUBLIC_DEPLOY_MODE` (enum) and, if used,
  `NEXT_PUBLIC_COOKIE_DOMAIN`; `api-hono.ts` validates `DEPLOY_MODE` and `COOKIE_DOMAIN`. Both expose
  the typed `DeployMode` value the same way every other env value is exposed today. Runtime code reads
  `env.DEPLOY_MODE`, never recomputes it.

**`packages/auth` — owns behavior.**

- Consolidate the runtime handoff mechanics here (moved out of where #720 put them in config):
  `mintHandoffToken`, `HANDOFF_TOKEN_PATTERN`, `HANDOFF_NONCE_COOKIE`, the `handoffIdentifier(id, nonce)`
  helper, next to the existing `getCookieDomain`/`getCookiePrefix` in `lib/utils.ts`.
- **Delete** #720's runtime `resolveDeployMode` (the string-suffix version). Auth reads
  `env.DEPLOY_MODE` once at module init and branches: `shared` → `crossSubDomainCookies` with the baked
  `COOKIE_DOMAIN`; `host-only` → fallback; `split` → `SameSite=None` host-only + handoff +
  `account.skipStateCookieCheck: true`.
- No `tldts` in auth's runtime graph. `getCookieDomain` returns the baked shared cookie domain (or the
  dev `.localhost` value) with no PSL parsing.

**`packages/config` — build plumbing only, no deploy logic.**

- `definePackageConfig` (`@packages/config/tsdown`) gains a **generic** `define` pass-through so the api
  build can bake a literal. This stays generic (it is not deploy-aware); the deploy value is computed in
  `env` and handed to the factory by the api's `tsdown.config.ts`.

### Build-time injection

- **Web** (`web/next/next.config.ts`, already imports env): compute
  `resolveDeployMode(webUrl, apiUrl)` from `@packages/env/deploy`, then expose it to the client as
  `NEXT_PUBLIC_DEPLOY_MODE` (and `NEXT_PUBLIC_COOKIE_DOMAIN` if used) via Next's `env` config /
  `process.env` so Next **inlines the literal** into the client bundle. `tldts` runs here only, at build.
- **API** (`api/hono/tsdown.config.ts`): compute the mode from `@packages/env/deploy`, pass
  `define: { "process.env.DEPLOY_MODE": JSON.stringify(mode), ... }` through `definePackageConfig`.
  `tsdown` bakes the literal; the non-taken mode branches and the `tldts` import **tree-shake out** of
  the api bundle. `tldts` runs here only, at build.
- The URLs to feed `resolveDeployMode` come from the same env the apps already read
  (web origin + `NEXT_PUBLIC_API_URL` / `HONO_APP_URL`); no new required env var is introduced.

### Port, replace, new

**Port from the #720 branch verbatim in behavior (verified — do not redesign):**

- The api handoff router (`/start` + `/claim`, mode-gated to 404 outside split, the 64-hex token regex,
  the `handoffIdentifier` nonce-in-identifier scheme, single-use `createVerificationValue` /
  `consumeVerificationValue`, 60s TTL).
- The web claim route (mode-gated 404, the `maxAge` `Number.isFinite` guard, `fail()` keeping the nonce
  on failure, first-party cookie set on success).
- The per-sign-in nonce minted as a first-party web cookie and threaded through the handoff.
- `account.skipStateCookieCheck: true` in split mode — **A/B-proven load-bearing on Safari** (P0 true →
  dashboard; P1 false → breaks at the api origin). Carries the documented, accepted login-CSRF tradeoff
  (see Further notes).
- `SameSite=None` host-only cookies in split mode.
- `getSession` forwarding cookie only (no `x-forwarded-for`) + `cache: "no-store"`.

**Replace (the point of this PR):**

- Detection: runtime string-match against `PUBLIC_HOSTING_SUFFIXES` → build-time `tldts`. Delete
  `PUBLIC_HOSTING_SUFFIXES` entirely.
- Trigger: narrow (api-on-public-suffix) → wide (no shared cookie domain). [L2]
- Home: `config/src/deploy.ts` → split across `env` (detection + value) and `auth` (mechanics). [L1]
- Mode source at runtime: module-init recomputation → read the baked `env.DEPLOY_MODE` literal.
- Shared-mode cookie domain: runtime PSL-ish derivation → baked `COOKIE_DOMAIN`.

**New (did not exist in #720):**

- The `env/src/deploy.ts` build-only detector and the `tldts` devDependency.
- The build-injection wiring in `next.config.ts` and `tsdown.config.ts` (+ the generic `define`
  pass-through in `definePackageConfig`).
- The automated "no `tldts` in any shipped bundle" assertion. [L3]

---

## Testing decisions

**Seams (highest first, fewest possible).** The entire _novel_ correctness surface collapses to one
seam: `resolveDeployMode(web, api)` is a pure function, so a single input to output table validates every
mode decision (shared / host-only / split, the wide trigger, the dev-localhost short-circuit) at the
highest point in the stack, above build injection and above runtime branching. Everything else is a
_reused_ seam or a build gate, not a new one: the ported handoff/cookie mechanics keep #720's existing
`packages/auth/test/` seam, and the L3 "no `tldts` in a shipped bundle" invariant is a build-output
assertion that cannot fold into a unit seam. Target shape: **one new behavioral seam, one reused seam,
one build gate, one manual release gate** (below, in that order).

A good test here asserts only external behavior: a topology pair in, a mode out; a host in, a cookie
domain out; a built artifact, a grep result. None of them reaches into how detection is computed.

Prefer the existing seams. #720's tests live in `packages/auth/test/` (a `utils.test.ts` and a
`deploy.test.ts`, 14 tests total; the deploy test was deliberately relocated to `packages/auth` because
`bun:test` does not resolve under `@packages/config`). Keep tests where their subject now lives.

1. **Detection truth table (unit, in `packages/env`).** `resolveDeployMode(web, api)` over a table that
   must include, at minimum: two `*.vercel.app` projects → `split`; two subdomains of one custom domain →
   `shared`; two **different** custom domains → `split` (the wide arm, the new case); `.localhost`
   subdomains → `shared` (dev, no `tldts`); a bare host → `host-only`; and one representative row per
   public suffix shape you care about (`netlify.app`, `pages.dev`, `workers.dev`, `up.railway.app`).
   This replaces #720's `isPublicHostingSuffix`/`isSplitPair`/curated-list tests. The test lives with its
   subject in `packages/env/test/`; make `bun:test` resolve there the way `packages/auth` already does
   (add `@types/bun` to `packages/env` if absent), and do **not** edit the shared `@packages/config`
   tsconfig to force resolution (standing rule from the #720 review).
2. **Handoff + cookie mechanics (unit, in `packages/auth`).** `getCookieDomain` table (including the
   `.localhost` carve-out and the baked shared domain), `mintHandoffToken` shape, `HANDOFF_TOKEN_PATTERN`,
   `handoffIdentifier`. Ported from #720.
3. **Runtime reads the baked literal, not a recomputation.** A test proving auth branches on
   `env.DEPLOY_MODE` and that no runtime module imports `@packages/env/deploy` (grep/import-graph
   assertion), so `tldts` cannot reach a runtime graph.
4. **The L3 invariant — no PSL in shipped bundles (the load-bearing new check).** AMENDED during
   implementation (maintainer call): enforced at the source seam, not the built artifact. A repo-wide
   test asserts no file under any `src/` imports `@packages/env/deploy` or `tldts` (import statements
   only); build configs live outside `src/`, so the boundary is exact, and bundlers cannot pull PSL
   code into an artifact no source file imports. This replaced a per-build bundle grep, which was
   dropped because the enforcement belongs in one CI test, not a step in three build scripts (and a
   name-grep is unreliable anyway: "tldts" does not survive bundling+minification).
5. **`skipStateCookieCheck` reaches `oauthConfig` at runtime.** Reuse #720's `betterAuth` +
   `memoryAdapter` test proving `oauthConfig.skipStateCookieCheck === true` in split mode on
   `better-auth@1.6.23`.
6. **Field verification (manual, required before merge).** Re-run the studiozero (`*.vercel.app` pair)
   Safari end-to-end: GitHub sign-in in a Private window with Prevent Cross-Site Tracking on lands on the
   server-gated `/dashboard`; handoff claim is single-use (replay dead); `/dashboard` is 200 with the
   handed-off cookie and 307 without. The two-different-custom-domains arm (L2) is logically covered by
   test 1 but is **not** field-verified; note that explicitly in the PR.

---

## Out of scope

Carried from #720's "Not in this PR" plus this PR's own deferrals. Track under Icebox #707.

- The full `vercel.mdx` "without a custom domain" walkthrough (this PR ships only the split-mode boot
  warning + the short note that the two-project `*.vercel.app` setup works out of the box).
- Vercel preview self-wiring (a split preview pair auto-configuring from the branch-URL pattern);
  deferred to the #677 plan. Feature-branch previews still point at explicit envs.
- Per-client rate-limit keying for the server-to-server handoff call (the api keys under the web
  function's egress IP; `getSession` stays cookie-only).
- `INTERNAL_API_URL` → `DOCKER_INTERNAL_API_URL` rename (orthogonal).
- A web-origin session proxy for Safari/Firefox _client-side_ session reads (sign-in itself is fixed;
  this is only for browser JS reading the session cross-origin).
- The tighter callback-to-nonce binding that would close the accepted split-mode login-CSRF tradeoff.
- Re-extending the split-mode web session cookie as the session rolls.
- The #719 WebSocket escape hatch (`NEXT_PUBLIC_API_WS_URL` + reconnect backoff).
- Renaming `HONO_APP_URL` → `BETTER_AUTH_URL`/`API_URL` (its own breaking change; not bundled here).

## Further notes

- **Better Auth's own position (research verdict).** There is no first-class Better Auth fix for two
  `*.vercel.app` projects — the maintainer (ping-maxwell, discussion #5073) states it is "not something
  Better-Auth can fix... browser-level cookie isolation via `.vercel.app`", and recommends: a reverse
  proxy (= the closed Plan B / PR #716), a custom domain + `crossSubDomainCookies`, or OIDC/Bearer.
  Issues #4270 / #4878 are closed-not-planned; #7283 is open-unanswered. Our handoff is Better Auth's own
  One-Time-Token "SSO handoff" pattern, nonce-hardened; `oauth-proxy` is itself a redirect handoff and
  takes the same `state`-cookie posture we take. This PR fills an acknowledged gap with sanctioned
  primitives; it does not fight the framework.
- **Accepted split-mode tradeoff (documented at the call site).** `skipStateCookieCheck` validates the
  OAuth callback against the DB state (single-use, server-issued CSPRNG, deleted on parse) but not a
  browser-bound cookie, so a relayed callback can set the api-origin session in another browser — a
  bounded login-CSRF (mostly Chrome third-party cookies; SSR stays protected by the nonce). Inherent to
  cookie-less cross-origin OAuth and the posture `oauth-proxy` takes. The tighter binding that closes it
  is deferred (see Out of scope, Icebox #707).
- **Zero-regression claim, unchanged from #720.** One operator config shape everywhere; no new required
  env var; no secrets on the web app; the mode is a static literal so the per-request path gains no
  instructions in any mode; split-mode cost is one extra redirect + one insert/delete per sign-in only.
  The added correctness (real PSL, wide trigger) carries no runtime weight because it is all build-time.
- **Naming.** Deliberately not locked in this document. Lock the names (the `DeployMode` member spellings,
  `resolveDeployMode` vs alternatives, `HANDOFF_*` constants, the `DEPLOY_MODE` env key) as the first
  step of the spec, before code, per the maintainer's "talk naming from the start". The names used above
  are descriptive placeholders, not decisions.
