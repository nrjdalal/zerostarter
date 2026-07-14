# Same-origin host-only auth (for the `<env>.api.<domain>` layout)

- Status: in progress (implemented in `feat/host-only-auth`, verified locally + Docker; pending review, then the deploy steps below)
- Links: #677 / [dynamic-preview-urls](dynamic-preview-urls.md) (the layout this unblocks, and whose CORS predicate this removes) · #713 (the deferred host-only PR this supersedes) · #674 (where canary aliasing surfaced the layout)

## Why now

Canary already moved to the target layout, and the deployed code is built for the opposite one.

Live canary today: web `canary.zerostarter.dev`, api `canary.api.zerostarter.dev` (both domains serve; the old `api.canary.zerostarter.dev` still resolves). The Vercel env is flipped via `preview @canary` git-branch overrides: `NEXT_PUBLIC_API_URL` and `HONO_APP_URL` are `https://canary.api.zerostarter.dev`; `NEXT_PUBLIC_APP_URL` and `HONO_TRUSTED_ORIGINS` are `https://canary.zerostarter.dev`.

`packages/auth/src/lib/utils.ts` assumes api-leftmost (`api.<env>.<domain>`) and misfires on the new shape:

- `getCookieDomain("https://canary.api.zerostarter.dev")` returns `.api.zerostarter.dev`. The web host `canary.zerostarter.dev` is not under that domain, so the browser never sends the session cookie to the web origin and SSR (`web/next/src/lib/auth/index.ts`) sees no session. The same cookie **is** delivered to prod's `api.zerostarter.dev`.
- `getCookiePrefix("https://canary.api.zerostarter.dev")` returns `"api"`, which is not an env name.

So the layout change and the cookie model are one change. This is that change.

## The layout, and the catch it exposes

web `[<env>.]zerostarter.dev`, api `[<env>.]api.zerostarter.dev`; production is the no-prefix case. The `api.` label sits before the base domain so a single-label wildcard (`*.zerostarter.dev`, `*.api.zerostarter.dev`) catches every branch. Nothing can wildcard-match `api.<branch>.zerostarter.dev`, which is why [dynamic-preview-urls](dynamic-preview-urls.md) requires this shape.

The catch: in this layout web and api are **not** parent and child. Production's `zerostarter.dev` + `api.zerostarter.dev` happen to be (which is why production works today), but `canary.zerostarter.dev` + `canary.api.zerostarter.dev` are cousins whose only shared parent is `.zerostarter.dev`. A shared cross-subdomain cookie would have to be `Domain=.zerostarter.dev`, broadcasting to every env. That is the leak. Host-only cookies remove the need for a shared Domain at all.

## The design

The browser only ever talks to the web origin. The `/api/:path*` rewrite already present in `next.config.ts` proxies to the api. Cookies carry no `Domain`, so per RFC 6265 §5.3 they bind to the host the browser called: the web origin. Each env's web host becomes its own cookie namespace, so isolation is structural. No Domain math, no env prefix, no per-env cookie name.

It is a net deletion: `getCookieDomain`, `getCookiePrefix`, the `advanced.crossSubDomainCookies` block, and the `.localhost` carve-out all go. It also gives each worktree its own session locally, which is what this branch is named for.

## Evidence (verified, not assumed)

Better Auth 1.6.23, read from installed source and confirmed with a probe:

- **Host-only is the default.** `cookies/index.mjs:22-23,36` is the only place a `Domain` is derived, gated entirely on `crossSubDomainCookies.enabled`. Omit it and no `Domain` attribute is ever emitted. Probe confirmed: `domain` appears only when the flag is on.
- **`baseURL` is a pure config value.** `utils/url.mjs:68-69` returns immediately on an explicit string; Host / `x-forwarded-host` fallbacks are dead. The router derives its mount path from `new URL(ctx.baseURL).pathname` (`api/index.mjs:150-152`) and **never compares Host**, so the api can serve `/api/auth` on its own host while the browser reaches `/api/auth` on the web host. The proxy must preserve the `/api/auth` prefix.
- **`baseURL` seeds trustedOrigins** with its own origin (`context/helpers.mjs:73-74`), so the web origin is auto-trusted.
- **The Origin check reads the browser's `Origin` header, never Host** (`api/middlewares/origin-check.mjs:95-113`).
- **The client `baseURL` must be absolute**; a relative value throws (`client/config.mjs:24` -> `utils/url.mjs:33-41`).
- **OAuth redirect is `${ctx.baseURL}/callback/${provider}`** (`api/routes/sign-in.mjs:133`). With a DB adapter the state strategy is `"database"`, but a signed `state` cookie is still set and enforced (`state.mjs:57-58,116-122`); it is host-only on the web origin with `SameSite=Lax`, which a top-level callback navigation permits.

Next.js 16.2.10, verified empirically against a real dev server proxying to an echo server:

- **A rewrite to an absolute external destination is a true reverse proxy** (bundled `http-proxy`). `Origin` is forwarded **verbatim**; `Cookie`, method and body are forwarded; only `Host` is rewritten (`changeOrigin`), with the original in `x-forwarded-host`. Host rewriting is harmless here because the Origin check never reads Host.
- **`Set-Cookie` is untouched** (no `cookieDomainRewrite` is set). A cookie-jar test confirmed a host-only cookie set by the api bound to the **web** origin.
- **`Location` is not rewritten**, which is fine: `agents.ts` builds its redirect from the forwarded `origin` header.
- Cost: every browser `/api/*` call takes an extra hop through the Next server, and `http-proxy` sets `connection: close` (no keep-alive to the api). Offsetting win: same-origin requests no longer preflight.

## This is the recommended pattern, not a workaround

Every authority consulted lands on host-only + same-origin proxy for exactly this shape (web on `example.com`, api on `api.example.com`, cookie session):

- **Better Auth's own docs.** The "Safari, ITP, and Cross-Domain Setups" page (`concepts/cookies`) gives two solutions for a different-origin api and lists the **reverse proxy first**, with a copy-paste Vercel `rewrites` snippet identical in shape to ours (`/api/:path*` -> the api). The Security reference says to **leave `crossSubDomainCookies` disabled** because cookies are host-only by default and each host gets an independent session. So the library recommends both halves of option B and ships the option-A knob (`crossSubDomainCookies`) with a warning.
- **IETF BCP** `draft-ietf-oauth-browser-based-apps` ranks the BFF/same-origin architecture first ("strongly recommended"), and its cookie rules read like a spec for this design: MUST Secure+HttpOnly, SHOULD NOT set `Domain`, SHOULD use `__Host-`.
- **OWASP Session Management** and **RFC 6265bis §4.1.3.2 / §8.6**: don't set `Domain` on session cookies; a parent-domain cookie is delivered to every subdomain and can't be distinguished from one a sibling set (cookie tossing, CWE-923). Real incidents: GitHub Pages 2013, Gitpod OAuth hijack (CVE-2024-21583, fixed by adopting `__Host-`).
- **What security-conscious first-party sites actually do:** GitHub, Stripe (`__Host-session`), Google (`__Host-GAPS`), Atlassian all use host-only session cookies with a token-only api, not a shared parent-domain cookie. Broad `.parent` cookies show up for analytics, not first-party session auth.
- Option A here would also be the exact cross-env leak this repo already reasoned about: under `<env>.api.<domain>` a `.zerostarter.dev` cookie reaches prod, canary, and every preview, isolated only by a per-env secret you must never share. The library guidance and the isolation requirement point the same way.

## Proxy cost: smaller than it sounds (measure to confirm)

- **On Vercel, an external `next.config` rewrite is a CDN routing rule, not a billable Function invocation.** Evidence: the proxied-request timeout is 120s on all plans (exceeds the Hobby Function ceiling, so it can't be a Function); failures surface as `ROUTER_EXTERNAL_TARGET_ERROR` (a router error); observability models "External Rewrites" as a distinct traffic class; `@vercel/next` compiles the absolute URL into `routes[].dest` in the Build Output. Not stated verbatim by Vercel, so **verify the Functions invocation counter on a preview before treating it as load-bearing.** (Doing the same proxy in `middleware`/`proxy.ts` WOULD be billable compute; the rewrite is not.)
- The scary `connection: close` / TLS-per-call cost is the **self-hosted** path (`next start`). In Docker self-host the rewrite targets `http://api:4000` intra-network, sub-ms RTT, so it is negligible there too.
- **Volume audit (this repo):** ~2-4 proxied XHR per page-view, dominated by one better-auth session check that a shared nanostore collapses to a single request per hard load. No default interval polling of the api (the only poller is the landing health badge at 30s, which self-disables whenever its WebSocket is healthy). SSR/RSC reads never touch the proxy (they use `INTERNAL_API_URL` direct). So the proxy sits on a **warm, not hot** path.

## The one real tax: authenticated WebSockets

Host-only means the session cookie is not sent cross-origin, so a socket to the api host carries no session and can't ride the HTTP rewrite. Today the only socket is the **public** health badge (unauthenticated), so there is no problem now, and the plan keeps it cross-origin at the api host on purpose. But the day the starter (or a fork) wants authenticated realtime, option B forces a second credential path (a short-lived WS ticket minted over the proxied HTTP path, or a bearer token) where option A would have used the cross-subdomain cookie for free. That is the genuine architectural cost of this design; a WS ticket is small and arguably more correct (browsers don't enforce SameSite/CORS on WS upgrades anyway), but it is real added surface if/when it comes.

`__Host-` prefix is deliberately **not** in scope: Better Auth emits `__Secure-` (host-only) natively but has no `__Host-` option, so adding it needs an edge cookie-name rewrite on the api (extra surface), and it can't apply to the local `http://` origin. Host-only with no `Domain` already delivers the structural isolation; `__Host-` is a marginal tossing-hardening left as a deferred option.

## Framework portability (decided with the user)

The same-origin `/api/*` proxy is the **only** piece that lives in a framework's config rather than in shared code, and that is fine: every framework does proxying (the migration target is likely TanStack Start / TanStack Query, which does). So this is not a coupling concern; a migration ports one rewrite, while the Better Auth config, the isolation model, and the env vars are framework-agnostic and move unchanged.

It stays in `web/next/next.config.ts` (not split into `vercel.json` + a self-host reverse proxy) because that single rewrite already covers all three surfaces via its adaptive destination `INTERNAL_API_URL || NEXT_PUBLIC_API_URL`:

- **Vercel** (prod/canary/preview): compiled to an edge external rewrite to the api's public URL (`<env>.api.zerostarter.dev`); no Function hop.
- **Local `next dev`** (through portless): server-side proxy to `NEXT_PUBLIC_API_URL` (`api.zerostarter.localhost:1355`).
- **Docker `next start`** (self-host): server-side proxy to `INTERNAL_API_URL` (`http://api:4000`), so the browser only ever sees `localhost:3000` and the host-only cookie binds there. No separate reverse proxy is added to the compose.

So "make it agnostic" costs nothing here beyond a one-line migration note; keeping the proxy in the framework config is the minimal-footprint choice.

## Changes

**`packages/auth`**

- `src/index.ts`: `baseURL: env.BETTER_AUTH_URL` (the web origin; was `env.HONO_APP_URL` = the api origin); delete the whole `advanced` block (`crossSubDomainCookies` + `cookiePrefix`).
- `src/lib/utils.ts`: delete `getCookieDomain` and `getCookiePrefix`; delete `test/utils.test.ts` accordingly.

**Env: rename `HONO_APP_URL` -> `BETTER_AUTH_URL`, value flips to the web origin.** Its only behavioural consumers are those three lines in `packages/auth` (two deleted); `api/hono` declares it as a boot-time `z.url()` gate but never reads it. Rename rather than repurpose (decision 1) and use `BETTER_AUTH_URL`:

- It is Better Auth's own canonical name for the auth base URL, and pairs with the `BETTER_AUTH_SECRET` this repo already uses. Under the proxy, "the public origin auth is served from" IS the web origin, so the value is semantically correct, not a hack.
- Better Auth reads `BETTER_AUTH_URL` from env only as a fallback when no explicit `baseURL` is passed (`utils/url.mjs:69` short-circuits on an explicit string). We pass it explicitly, so there is no override risk, and the fallback would resolve to the same value anyway. (Do not set `NEXT_PUBLIC_BETTER_AUTH_URL` / `BASE_URL` to a different value in the same process; those are also read.)
- Rename touches: `packages/env/src/auth.ts:16,29`, `packages/env/src/api-hono.ts:12,24` (keep the gate or drop it, see decision 4b), `packages/auth/src/index.ts:37`, `turbo.json:39` (globalEnv), `.github/scripts/portless.ts:31` (this line currently injects the _api_ url; it must now inject the _web_ url), `.env.example:7`, and the docs below. `packages/cli` needs no change: `seedEnv` copies `.env.example` verbatim, and `convert.ts` never references the name. Fork safety: `zerostarter sync` never overlays a fork's `.env` (it is preserved), so a synced fork keeps the _old_ name; because the new name is a required `z.url()` with no default, the fork fails loudly at boot instead of silently mis-issuing cookies (the whole reason to rename). Add a changelog migration line, since the loud failure is masked under `SKIP_ENV_VALIDATION` builds. Precedent: commit `7d7f6f08` renamed `NEXT_PUBLIC_POSTHOG_KEY` -> `POSTHOG_PROJECT_TOKEN` as one atomic `refactor(env):` sweep.

**`web/next`**

- `src/lib/config.ts`: `api.url` resolves per side. Browser -> `window.location.origin`; server -> `INTERNAL_API_URL || NEXT_PUBLIC_API_URL`. Add `api.publicUrl` (the absolute api origin) for the WebSocket client.
  Use `window.location.origin`, **not** a relative `/api` and **not** `NEXT_PUBLIC_APP_URL`: `hono/hc`'s `$url()` and `$ws()` both do `new URL(base)` and throw on a relative base, and both are used (`lib/auth/index.ts:10`, `components/marketing/api-status.tsx:49`). `NEXT_PUBLIC_APP_URL` is inlined at build, so it would be the wrong host under one-build-many-hosts previews; `window.location.origin` is always the host the user is on.
- `src/lib/api/client.ts`: `const url = config.api.url` (the browser/server split now lives in config).
- `src/lib/auth/client.ts`: no textual change (`${config.api.url}/api/auth` now resolves to `<web-origin>/api/auth`); add a comment recording the same-origin intent so it is not "fixed" back.
- `src/components/common/access.tsx:163`: form action becomes the relative `/api/agents/sign-in-as`.
- `src/components/marketing/api-status.tsx:49`: point `$ws()` at `config.api.publicUrl`, keeping the WebSocket cross-origin at the api host (it is unauthenticated and needs no cookie; WS upgrade through the rewrite is unverified and Vercel WS is already special-cased).
- `src/app/(protected)/layout.tsx:18`: simplify to `config.api.url`.
- `src/lib/auth/index.ts`: no change. It forwards the incoming `Cookie` header explicitly, which is exactly why SSR keeps working with host-only cookies.
- `next.config.ts`: the existing `/api/:path*` rule is already correct.

**`api/hono`**

- `src/index.ts`: drop `credentials: true` from `cors()`. It is now a no-op (a cross-origin call to the api host carries no host-only cookie) and it is the exact switch that would re-admit cross-origin credentialed access. Keep the `cors()` middleware (the api is a public surface) and keep `HONO_TRUSTED_ORIGINS` (still load-bearing for Better Auth `trustedOrigins` and `agents.ts`).
- `src/routers/agents.ts`: no change.

**`.github/scripts/portless.ts`**: no change required. Same-origin proxying works locally through portless (browser -> `zerostarter.localhost:1355/api/*` -> Next -> rewrite -> `api.zerostarter.localhost:1355`), a double portless hop. Optionally inject `INTERNAL_API_URL=http://localhost:<apiPort>` to shortcut SSR; a nicety, not a requirement.

**Docs and skills** (same change, per the sync rule)

- Agent login moves to the web origin: `$API/api/agents/sign-in-as` -> `$WEB/api/agents/sign-in-as` in `AGENTS.md:40`, `web/next/content/docs/getting-started/working-with-agents.mdx:57`, `.agents/skills/dev/SKILL.md:52`.
- `web/next/content/docs/manage/authentication.mdx:67` ("Cross-subdomain cookies switch on automatically when `HONO_APP_URL` is a subdomain") becomes false; rewrite for host-only same-origin, including the OAuth callback URLs at :35.
- `web/next/content/docs/deployment/vercel.mdx:48` and `manage/environment.mdx:25,26,65`: `HONO_APP_URL`'s meaning/value.

## Config and deploy steps (not code)

1. **OAuth redirect URIs move to the web origin**, per env: `https://zerostarter.dev/api/auth/callback/{github,google}`, `https://canary.zerostarter.dev/api/auth/callback/{github,google}`, and locally `http://zerostarter.localhost:1355/api/auth/callback/{github,google}` (branch-prefixed per worktree; `http://localhost:3000/...` under `PORTLESS=0`). Providers do not wildcard-match, so each local worktree host needs its own entry or a dev app per pattern. A `GITHUB_CLIENT_SECRET @canary` override already exists, so canary appears to have its own app.
2. **Vercel env**: set `BETTER_AUTH_URL` to the web origin for production (`https://zerostarter.dev`) and canary (`https://canary.zerostarter.dev`); delete the old `HONO_APP_URL` entries. Update the `preview @canary` scope and the production default in both projects.
3. **Per-env `BETTER_AUTH_SECRET`** (optional, decision 3): today one secret covers `production,preview,development`. Under host-only, isolation is structural (the cookie is never delivered cross-env), so a per-env secret is now defence-in-depth, not the boundary. This is the one reversal from the old note, which called the per-env secret "the durable boundary": that was true under the cross-subdomain model where the cookie physically reached every env; under host-only it no longer is. Still cheap and worth doing, but no longer load-bearing.
4. Everyone is logged out once, from the cookie name and domain change.

## Sequencing (the sharp edge)

Production currently **works** on the old model, because its api is a child of its web host. This change alters production too (host-only, and `baseURL` becomes the web origin), and the canary->main release (PR #710) ships it. So production's OAuth redirect URIs and env var must be in place **before** that release merges, or production auth breaks on deploy. Canary is already broken, so canary's code + env + OAuth land together and can be verified end to end first.

## What this buys [dynamic-preview-urls](dynamic-preview-urls.md)

That plan currently states: "Required code change (api CORS becomes a predicate) ... dynamic preview origins need `cors({ origin })` to be a function that also accepts `https://<slug>.zerostarter.dev` ... This is a security decision (trusting any `*.zerostarter.dev` origin with credentials in preview only)."

**That requirement disappears.** With host-only same-origin the browser never calls the api cross-origin with credentials, so no CORS predicate and no wildcard-origin credential trust is needed, and every preview host is isolated by construction with no per-preview secret. Its "two-domain (cross-origin) model is retained because WebSockets need cross-origin" rationale still holds, but narrows to the WebSocket only, which stays cross-origin and unauthenticated. Update that plan when this lands.

Preview provisioning itself is unchanged and still gated on the one-time owner action in that plan: wildcards plus a wildcard cert, which requires either moving `zerostarter.dev` to Vercel nameservers or delegating `_acme-challenge`. Research confirmed there is no native Vercel feature mapping an arbitrary branch to `<branch>.zerostarter.dev`; the alias-on-deploy approach that plan already chose is correct, and the paid Preview Deployment Suffix ($100/mo, team-wide) would not even produce this URL shape.

## Decisions (resolved after the deep-research pass)

1. **Rename `HONO_APP_URL` -> `BETTER_AUTH_URL`** (not repurpose). Library-canonical, pairs with `BETTER_AUTH_SECRET`, no env-override risk, and a synced fork fails loudly instead of silently mis-issuing. Detail in the Env section above.
2. **Drop `cookiePrefix`.** Redundant under host-only; it renames cookies (logs everyone out), which the Domain removal does anyway, so it is free now.
3. **Per-env `BETTER_AUTH_SECRET`: recommended, not required.** Host-only makes isolation structural, so this is now defence-in-depth. Do it (one env var), but it is no longer the boundary.
4. **Two small ones:**
   - a. **Retire `api.canary.zerostarter.dev`** after cutover: keep briefly as a rollback path, then remove.
   - b. **Keep the `BETTER_AUTH_URL` boot gate in `api-hono.ts`?** The api never reads it, but validating it at api boot catches a misconfigured deploy early. Lean keep (loud is good); drop only if we want the api env surface strictly to what the api consumes.

## Known limitation carried forward

Authenticated WebSockets need a separate credential path under host-only (see "The one real tax" above). Not a blocker now (only a public health socket exists); record it against the WS/realtime line item so whoever adds authenticated realtime designs a ticket/bearer path rather than reaching for a cross-subdomain cookie.
