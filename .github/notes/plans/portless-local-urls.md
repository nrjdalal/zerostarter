# Portless local URLs (named `.localhost` dev, worktree-native)

- Status: implemented (single PR combining the auth-isolation fix + portless) — verified locally end to end
- Links: [portless.sh](https://portless.sh) (vercel-labs) · shares the isolation model with [dynamic-preview-urls.md](dynamic-preview-urls.md) · decision recorded in memory `cookie-env-isolation-leak`

> **What shipped (supersedes the cookie model in the body below).** Auth isolation is **Option 2: same-origin host-only + `__Host-`**, NOT the cross-origin last-two-labels cookie approach originally drafted below (that would have transmitted prod sessions to `canary.zerostarter.dev`). The browser signs in **same-origin** against the web host (`/api/auth`, proxied to the API by the Next rewrite), so Better Auth sets a **host-only** cookie (no `Domain`; `crossSubDomainCookies` off) scoped to that one host, so a session never reaches a sibling env. In production (https) a small Hono middleware (`api/hono/src/lib/host-cookie.ts`) rewrites the `__Secure-` cookie name to the browser-enforced **`__Host-`** prefix (and back on read), also blocking a compromised sibling from tossing a `Domain` cookie the host would read. `getCookieDomain`/`getCookiePrefix` are deleted; `baseURL` = the web origin; CORS/trusted-origins are a strict allowlist in prod and `*.<base>` only outside prod. The portless mechanics below (root `dev.ts` wrapper, `PORTLESS_URL`-driven `portless-env.ts` shim, pinned appPorts, `server.ts` honoring `PORT`, `allowedDevOrigins`) shipped as described. Deferred: parallel worktree stacks (pinned ports), and `convert.ts` rebranding the per-app portless `name` for forks.

Serve local dev through the [portless](https://portless.sh) reverse proxy so dev URLs are named hosts that **structurally mirror preview and prod**, and so a worktree gets its own working URL (auth included) with no config:

|     | local main                       | local worktree                          | preview                      | prod                  |
| --- | -------------------------------- | --------------------------------------- | ---------------------------- | --------------------- |
| web | `zerostarter.localhost:1355`     | `<slug>.zerostarter.localhost:1355`     | `<slug>.zerostarter.dev`     | `zerostarter.dev`     |
| api | `api.zerostarter.localhost:1355` | `<slug>.api.zerostarter.localhost:1355` | `<slug>.api.zerostarter.dev` | `api.zerostarter.dev` |

One host grammar everywhere: **`[<slug>.]` (branch/env, leftmost) + `[api.]` (service) + `<app>.<tld>` (registrable)**. Portless prepends the worktree branch as the leftmost label automatically, so the worktree row is free.

## The shared fix (this is what "fixes dynamic-preview-urls.md for once")

Both this plan and the preview-URLs plan produce 4-label API hosts (`<slug>.api.zerostarter.<tld>`). Today's cookie helpers (`packages/auth/src/lib/utils.ts`) assume the opposite label order (`<service>.<env>.<app>.<tld>`, service leftmost) and break on them: `getCookieDomain("…/<slug>.api.zerostarter.dev")` returns `.api.zerostarter.dev` (not shared with the web host `<slug>.zerostarter.dev`) and `getCookiePrefix` returns `"api"`. So preview/worktree auth silently breaks. The web genuinely needs the shared cookie: it reads the session by forwarding the incoming request's cookies to the API (`web/next/src/lib/auth/index.ts`).

Rework both helpers to the unified grammar, keyed off the registrable domain instead of label counts:

- **`getCookieDomain(host)` = `.` + last two labels.** `localhost`/`127.0.0.1` -> `undefined` (host-only, unchanged). So web + api share `.zerostarter.<tld>` at any prefix depth.
- **`getCookiePrefix(host)` = the labels before the base, minus a trailing `api` service label, joined by `-`; empty -> `undefined`.** Namespaces the cookie _name_ per branch/env so many branches sharing one registrable domain don't collide.

Worked cases (all correct under the unified grammar):

| host                                          | cookieDomain             | cookiePrefix |
| --------------------------------------------- | ------------------------ | ------------ |
| `zerostarter.dev` (prod web)                  | `.zerostarter.dev`       | -            |
| `api.zerostarter.dev` (prod api)              | `.zerostarter.dev`       | -            |
| `canary.api.zerostarter.dev`                  | `.zerostarter.dev`       | `canary`     |
| `<slug>.api.zerostarter.dev` (preview)        | `.zerostarter.dev`       | `<slug>`     |
| `<slug>.api.zerostarter.localhost` (worktree) | `.zerostarter.localhost` | `<slug>`     |
| `localhost` / `127.0.0.1`                     | - (host-only)            | -            |

better-auth supports this directly: `advanced.crossSubDomainCookies.domain` (explicit shared domain) and `advanced.cookiePrefix` (name namespace) - both already wired in `packages/auth/src/index.ts`.

**Requires the canary host migration the preview plan already calls for:** `api.canary.zerostarter.dev` -> `canary.api.zerostarter.dev` (only the new order parses correctly). This changes canary's cookie domain/prefix; on the shared canary/prod Neon DB it only re-scopes cookies (logs sessions out), no data change - still ship it as a deliberate release.

## Trusted origins / CORS: one predicate, shared by API and auth

`HONO_TRUSTED_ORIGINS` stays the explicit allowlist (prod + canary exact origins). Add a wildcard allowance for the dynamic hosts, gated to non-production, as a single predicate reused by both Hono `cors({ origin })` and better-auth `trustedOrigins`:

> allow an origin if it is in the explicit list, **or** `NODE_ENV !== "production"` and its host matches `*.<baseDomain>` (baseDomain = last two labels of `HONO_APP_URL`).

This trusts every `*.zerostarter.dev` in preview and every `*.zerostarter.localhost` locally (with credentials) - the same security decision the preview plan records, now covering local worktrees too. Ensure preview deployments run `NODE_ENV` != `production` (canary can stay production; its origins are explicit).

## Local run: unprivileged, worktree-aware, cross-origin (mirrors prod)

Default dev flow, **project-level dependency (no global install), zero sudo.** Portless defaults to port 443 + auto-sudo; pin its unprivileged fallback and drop the two admin steps:

- `PORTLESS_PORT=1355` (unprivileged), `PORTLESS_HTTPS=0` (HTTP, no CA-trust step; `.localhost` is still a secure context and better-auth over `http://` leaves cookies non-`Secure`, matching today), `PORTLESS_SYNC_HOSTS=0` (no `/etc/hosts` write). Chrome/Firefox/Edge resolve `*.localhost` natively; **Safari needs the hosts entry (documented caveat).**

Keep the **cross-origin** topology (browser -> API host directly), matching prod - the preview plan keeps cross-origin because WS upgrades don't ride the same-origin `/api` rewrite. Pin child ports (web 3000, api 4000) so server-side/CLI use loopback and never need to resolve `*.localhost`:

- Browser -> `http://<slug>.api.zerostarter.localhost:1355` (proxy -> 4000); the cookie fix makes auth work on the slugged host.
- Next SSR + health checks -> `http://localhost:4000` via `INTERNAL_API_URL` (the `next.config.ts` rewrite and server-side `apiClient` already prefer it).

**Worktree URLs must reach the env.** The browser-facing URLs carry the slug that portless assigned; the app must advertise the _same_ slug or better-auth's baseURL/origin won't match. Portless injects `PORTLESS_URL` (the app's actual assigned URL, slug included) into each child. So the slug lives in exactly one place - portless - and we read it, never re-derive it:

- Each app's `dev:app` runs through a shared shim `.github/scripts/portless-env.ts <cmd…>`: when `PORTLESS_URL` is set, it derives the web+api URL pair by adding/removing the `api.` label, exports the five URL vars (`HONO_APP_URL`, `HONO_TRUSTED_ORIGINS`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `INTERNAL_API_URL=http://localhost:4000`), then execs the real command. Setting real `NEXT_PUBLIC_*` env _before_ `next dev` keeps client inlining correct (deriving inside `packages/env` would not inline client-side). When `PORTLESS_URL` is unset (`PORTLESS=0`, CI), it passes through untouched and static `.env` values win.
- All portless-awareness lives in fork-excluded `.github/scripts` dev tooling; `packages/env` stays portless-agnostic. The only shipped runtime change is the cookie/origins fix (which is a real cross-env fix, not portless-specific).

Parallel worktree stacks (two `bun dev` at once) still collide on the pinned 3000/4000; document a per-worktree port offset as the advanced path. Single active worktree - the normal case - fully works.

## Orchestration & config

- `web/next/package.json`: `"dev": "portless"`, `"dev:app": "bun ../../.github/scripts/portless-env.ts bun ../../.github/scripts/docs.ts && next dev"` (shim wraps the real command), `"portless": { "name": "zerostarter", "script": "dev:app", "appPort": 3000 }`.
- `api/hono/package.json`: `"dev": "portless"`, `"dev:app": "bun ../../.github/scripts/portless-env.ts concurrently \"tsdown --watch\" \"bun --hot src/index.ts\""`, `"portless": { "name": "api.zerostarter", "script": "dev:app", "appPort": 4000 }`.
- Root `package.json`: `"dev": "bun .github/scripts/dev.ts"` - sets `PORTLESS_PORT/HTTPS/SYNC_HOSTS`, spawns `turbo run dev --ui tui` (turbo still owns `^build` + persistence), forwards args. `PORTLESS=0 bun dev` bypasses portless.
- `portless` in the catalog + both apps' devDependencies. No root `portless.json` needed.

## Required code changes (shipped runtime)

1. `packages/auth/src/lib/utils.ts` - rewrite `getCookieDomain`/`getCookiePrefix` per the table above; update the JSDoc examples to the unified grammar; add unit tests for every row (prod/canary/preview/worktree/localhost).
2. `api/hono/src/index.ts` + `packages/auth/src/index.ts` - replace the static `origin`/`trustedOrigins` with the shared predicate (new helper, e.g. `packages/auth/src/lib/origins.ts`, consumed by both).
3. `api/hono/src/lib/server.ts:23` - honor `process.env.PORT` in the non-Vercel branch (mirrors the Vercel branch); portless sets `PORT=4000` for the pinned child.
4. `web/next/next.config.ts` - `allowedDevOrigins` from `new URL(env.NEXT_PUBLIC_APP_URL).hostname` + `*.` wildcard (dev-only, Next 16 cross-origin guard).

## Env (`.env.example`) defaults

```
HONO_APP_URL=http://api.zerostarter.localhost:1355
HONO_TRUSTED_ORIGINS=http://zerostarter.localhost:1355
INTERNAL_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://zerostarter.localhost:1355
NEXT_PUBLIC_API_URL=http://api.zerostarter.localhost:1355
```

`HONO_PORT` stays 4000. In a worktree the shim overrides these with the slugged hosts at runtime; keep bare-`localhost` values commented as the `PORTLESS=0` fallback.

## Docs, skills, CLI (doc-sync)

- `.agents/skills/dev/SKILL.md` - named-host start/restart, loopback health check, Safari + `PORTLESS=0` notes; `--hot` stale-route trap unchanged.
- Docs referencing the dev URLs: `getting-started/setup.mdx:57-58`, `working-with-agents.mdx`, `manage/authentication.mdx`, `manage/llms-txt.mdx`, `deployment/docker.mdx` (dev vs deploy refs); plus `AGENTS.md`/`CLAUDE.md` agent-login curl block and `web/next/src/app/(marketing)/page.tsx` if user-facing.
- `packages/cli/src/templates.ts:116` (fork README string) and `packages/cli/src/convert.ts` (rebrand the portless `name` in both apps' package.json: `zerostarter` -> fork slug, `api.zerostarter` -> `api.<slug>`; add to convert's test).
- Prerequisite: portless (vercel-labs) needs **Node 24+** and this repo is Bun-first - call it out; the Rust port (`portless-rs/portless`) is a Node-free alternative to evaluate.

## Verify at implementation

- Confirm `PORTLESS_URL` includes the `:1355` port (URLs won't route otherwise) and includes the worktree slug.
- Full sign-in -> dashboard flow on both the main-checkout hosts and a worktree's slugged hosts; inspect the Set-Cookie (`Domain=.zerostarter.localhost`, prefixed name in the worktree). Before/after screenshots (ui-verify).

## Rollout

1. Land the cookie/origins fix + tests (works for preview/canary independently of portless).
2. Add the wrapper + shim + portless config + `.env` + `server.ts`/`next.config.ts`; `bun install`.
3. `bun dev`, verify main + worktree flows in Chrome, health via loopback.
4. doc-sync sweep (strict build) + CLI convert test.
5. Coordinate the `canary.api.zerostarter.dev` host migration with a release (shared DB).
6. PR to canary (feature-scale, auth-touching - review before merge).
