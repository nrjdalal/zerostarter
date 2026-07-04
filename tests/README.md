# App Test Suite

A black-box characterization suite that locks the app's entire observable surface: every API endpoint, every web route, and every user-facing interaction. It talks to the running stack over HTTP (Bun's `fetch`) and a real browser (the `agent-browser` CLI) only, never framework internals, so it survives a frontend or backend rewrite unchanged. If a migration (e.g. Next.js to TanStack Start) preserves behavior, this suite stays green; anything it catches is a regression by definition.

Runner: `bun test`. HTTP specs use `fetch`; interaction specs drive Chromium through `agent-browser` (a thin wrapper lives in `support/browser.ts`). No Playwright, no Puppeteer.

## Layout mirrors the monorepo

Each test file sits at the path that mirrors the source it exercises, so the suite is navigable the same way the codebase is:

```
tests/
  support/                     shared helpers (not tests)
    urls.ts surface.ts http.ts browser.ts preload.ts
  api/hono/                    -> api/hono/src
    index.test.ts                 root/health/headers, OpenAPI + Scalar, CORS, rate limiter, error envelope
    routers/
      agents.test.ts              -> src/routers/agents.ts
      auth.test.ts                -> src/routers/auth.ts
      v1.test.ts                  -> src/routers/v1.ts
      waitlist.test.ts            -> src/routers/waitlist.ts (the HTTP API)
  web/next/                    -> web/next
    next.config.test.ts           -> next.config.ts (the /api/* proxy rewrites)
    app/                          -> src/app
      marketing.test.ts           -> (marketing): pages, metadata, nav, API status, theme, login flow
      docs.test.ts                -> (content)/docs + api/search: pages, search API, search dialog, sidebar nav
      blog.test.ts                -> (content)/blog: pages + nav
      dashboard.test.ts           -> (protected)/dashboard: gating + org switcher
      console.test.ts             -> (console): gating, gated search, admin render
      waitlist.test.ts            -> waitlist/: page + join form
      llms.test.ts                -> (llms.txt): llms.txt, llms-full.txt, .md/.txt rewrites
      og.test.ts                  -> og/: dynamic OG images
      sitemap.test.ts             -> sitemap.ts
      robots.test.ts              -> robots.ts
```

Each file merges the HTTP checks and the browser-interaction checks for its route, so one file is the whole story for that part of the app.

## Run

First make sure the dev stack is up (`bun run dev` at the repo root, or `bash tests/scripts/ensure-stack.sh` which starts it if needed), then:

```bash
bun run test                 # from the repo root (whole suite)
bun test                     # from tests/ (whole suite)
bun run test:api             # api/ only (fetch)
bun run test:web             # web/ only (fetch + agent-browser)
```

Requirements: `agent-browser` on PATH with a browser installed (`npm i -g agent-browser && agent-browser install`); the dev stack's Postgres reachable via `.env` `POSTGRES_URL`; web on `:3000` and api on `:4000` (override with `GOLDEN_WEB_URL` / `GOLDEN_API_URL`). A preload (`support/preload.ts`) waits for both servers before any spec runs; the agent session is signed in once and shared (an HTTP cookie for fetch specs, a saved browser state for admin e2e specs).

Do not run `bun run build` (or commit, whose pre-commit hook builds) while the suite is running: the build writes into the same `.next` the dev server serves from and causes transient failures until the dev server resettles. The suite also writes a few throwaway `@example.com` rows to the local waitlist table; organizations it creates are deleted at the end of the test.

## The pinned surface

`support/surface.ts` is the inventory the suite locks: every docs page + title, every blog post, marketing titles, the sitemap set, the OpenAPI paths, the error codes, the rate limits, the auth providers. When the surface changes on purpose (a page added or removed, copy changed), update that fixture in the same change; that is the point of a characterization suite.

## Coverage map

### API (`api/hono/`)

| Surface                                    | File                       | Behaviors locked                                                                                             |
| ------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /`, `GET /headers`, `GET /api/health` | `index.test.ts`            | version/environment envelope, header echo, health shape                                                      |
| 404 + method mismatch                      | `index.test.ts`            | exact `{ error: { code, message } }` envelope                                                                |
| CORS + rate limiter                        | `index.test.ts`            | preflight allow-list, credentials, untrusted origin gets nothing; anon 60/min, per-IP keying                 |
| `GET /api/openapi.json`, `/api/docs`       | `index.test.ts`            | exact path list, 429/500 everywhere, 401/400 where declared, Scalar UI                                       |
| `POST /api/agents/sign-in-as`              | `routers/agents.test.ts`   | Origin required, trusted-origin check, cookie + 302, admin role, GET is 404                                  |
| `/api/auth/*`                              | `routers/auth.test.ts`     | providers list, get-session null/authed, GitHub+Google URLs, sign-out, CSRF 403, reference                   |
| `GET /api/v1/session`, `/api/v1/user`      | `routers/v1.test.ts`       | 401 envelope anon; full shape + agent identity + doubled rate limit authed                                   |
| `GET`/`POST /api/waitlist`                 | `routers/waitlist.test.ts` | count threshold/rounding; ok, idempotent, trim/case, honeypot, 400 VALIDATION_ERROR variants, malformed JSON |

### Web (`web/next/`)

| Surface                                       | File                    | Behaviors locked                                                             |
| --------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| web `/api/*` proxy                            | `next.config.test.ts`   | GET/POST/auth/error parity through `:3000`                                   |
| `/`, `/hire`, `/resume`                       | `app/marketing.test.ts` | 200 + exact title; og/twitter tags; nav; API-status badge; theme; login flow |
| all 26 docs pages + `/api/search`             | `app/docs.test.ts`      | titles, og; search result shape + empties; search dialog; sidebar nav        |
| `/blog` + all 3 posts                         | `app/blog.test.ts`      | index lists posts, each renders, index-to-post nav                           |
| `/dashboard`                                  | `app/dashboard.test.ts` | anon 307 to `/`, authed 200; org switcher create/active/cleanup              |
| `/console`, `/console/docs`, console search   | `app/console.test.ts`   | anon 404 (never redirect), admin 200; gated search; admin render             |
| `/waitlist`                                   | `app/waitlist.test.ts`  | page renders; form success, validation, honeypot invisible                   |
| `/llms.txt`, `/llms-full.txt`, `.md`/`.txt`   | `app/llms.test.ts`      | index links, full corpus, per-page markdown + rewrite parity, 404s           |
| `/og`, `/og/home`, `/og/docs/*`, `/og/blog/*` | `app/og.test.ts`        | PNG renders, query params, unknown slug 404                                  |
| `/sitemap.xml`                                | `app/sitemap.test.ts`   | exact URL set (home + docs + posts)                                          |
| `/robots.txt`                                 | `app/robots.test.ts`    | allow all, disallow api/console/dashboard, sitemap link                      |

## Out of scope (deliberate)

- A real 429: rate limiting keys on client IP, which is absent for localhost traffic, so every local request gets its own bucket (that fallback is itself locked in `api/hono/index.test.ts`).
- Third-party redirect targets (GitHub/Google OAuth consent, PostHog, UserJot): only the handoff URL the app produces is asserted.
- Production-only behavior (`/headers` 403, hidden landing navbar, agents router absence): the suite runs against the local dev stack.
