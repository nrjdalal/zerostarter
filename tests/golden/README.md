# Golden Test Suite

A black-box characterization suite that locks the app's entire observable surface: every API endpoint, every web route, and every user-facing interaction. It talks to the running stack over HTTP (Bun's `fetch`) and a real browser (the `agent-browser` CLI) only, never framework internals, so it survives a frontend or backend rewrite unchanged. If a migration (e.g. Next.js to TanStack Start) preserves behavior, this suite stays green; anything it catches is a regression by definition.

Runner: `bun test`. HTTP specs use `fetch`; interaction specs drive Chromium through `agent-browser` (a thin wrapper lives in `src/browser.ts`). No Playwright, no Puppeteer.

## Run

First make sure the dev stack is up (`bun run dev` at the repo root, or `bash tests/golden/scripts/ensure-stack.sh` which starts it if needed), then:

```bash
bun run test:golden          # from the repo root (whole suite)
bun run test                 # from tests/golden (whole suite)
bun run test:api             # API endpoints only (fetch)
bun run test:web             # web routes only (fetch)
bun run test:e2e             # browser interactions only (agent-browser)
```

Requirements: `agent-browser` on PATH with a browser installed (`npm i -g agent-browser && agent-browser install`); the dev stack's Postgres reachable via `.env` `POSTGRES_URL`; web on `:3000` and api on `:4000` (override with `GOLDEN_WEB_URL` / `GOLDEN_API_URL`). A preload (`src/preload.ts`) waits for both servers before any spec runs; the agent session is signed in once and shared (an HTTP cookie for fetch specs, a saved browser state for admin e2e specs).

Do not run `bun run build` (or commit, whose pre-commit hook builds) while the suite is running: the build writes into the same `.next` the dev server serves from and causes transient failures until the dev server resettles. The suite also writes a few `golden-*@example.com` rows to the local waitlist table; organizations it creates are deleted at the end of the test.

## Layout

- `src/surface.ts`: the pinned inventory (every route, title, endpoint, error code). When the surface changes on purpose, update this fixture in the same change.
- `src/http.ts`: `fetch` helpers, the shared agent cookie, the error-envelope assertion, `eventually` (retry) and `waitForStack`.
- `src/browser.ts`: the `agent-browser` CLI wrapper (`Browser` class: open, click by role/link/snapshot-ref, waits, eval) and `ensureAgentState` (saved admin browser state).
- `src/preload.ts`: bun test preload that blocks until the stack is ready.
- `specs/api/`: `fetch` tests against the Hono API.
- `specs/web/`: `fetch` tests against the Next.js routes and route handlers.
- `specs/e2e/`: `agent-browser` tests for interaction flows.

## Coverage map

### API (`specs/api/`)

| Surface                                   | Spec                           | Behaviors locked                                                                                                             |
| ----------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET /`, `GET /headers`                   | `system.test.ts`               | version + environment envelope; local header echo                                                                            |
| `GET /api/health`                         | `system.test.ts`               | envelope shape, version format, rate limit headers                                                                           |
| 404 + method mismatch                     | `system.test.ts`               | exact `{ error: { code, message } }` envelope                                                                                |
| CORS                                      | `system.test.ts`               | preflight allow-list, credentials, untrusted origin gets nothing                                                             |
| Rate limiter                              | `system.test.ts`, `v1.test.ts` | anon 60/min headers, authed 120/min, per-IP keying                                                                           |
| `GET /api/openapi.json`                   | `openapi.test.ts`              | exact path list, 429/500 everywhere, 401/400 where declared                                                                  |
| `GET /api/docs`                           | `openapi.test.ts`              | Scalar UI serves and points at the spec                                                                                      |
| `POST /api/agents/sign-in-as`             | `agents.test.ts`               | Origin required, trusted-origin check, cookie + 302, admin role, GET is 404                                                  |
| `GET /api/auth/providers`                 | `auth.test.ts`                 | exact enabled provider list                                                                                                  |
| `GET /api/auth/get-session`               | `auth.test.ts`                 | null anon, session + user authed                                                                                             |
| `POST /api/auth/sign-in/social`           | `auth.test.ts`                 | GitHub + Google authorize URLs                                                                                               |
| `POST /api/auth/sign-out`                 | `auth.test.ts`                 | session invalidated                                                                                                          |
| Better Auth CSRF                          | `auth.test.ts`                 | credentialed POST without trusted Origin is 403                                                                              |
| `GET /api/auth/reference`                 | `auth.test.ts`                 | Better Auth reference serves                                                                                                 |
| `GET /api/v1/session`, `GET /api/v1/user` | `v1.test.ts`                   | 401 envelope anon; full shape + agent identity authed                                                                        |
| `GET /api/waitlist`                       | `waitlist.test.ts`             | threshold + rounding rule (0 below 10, else floor to 5)                                                                      |
| `POST /api/waitlist`                      | `waitlist.test.ts`             | ok, idempotent dup, trim/case, honeypot silent accept, 400 VALIDATION_ERROR (invalid, missing, too long), malformed JSON 400 |
| web `/api/*` proxy                        | `proxy.test.ts`                | GET/POST/auth/error parity through `:3000`                                                                                   |

### Web routes (`specs/web/`)

| Surface                                       | Spec             | Behaviors locked                                                   |
| --------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| `/`, `/hire`, `/resume`, `/waitlist`          | `pages.test.ts`  | 200 + exact `<title>`                                              |
| all 26 docs pages                             | `pages.test.ts`  | 200 + exact title per page                                         |
| `/blog` + all 3 posts                         | `pages.test.ts`  | index lists every post; each post renders                          |
| unknown page/docs/blog routes                 | `pages.test.ts`  | 404                                                                |
| `/dashboard`                                  | `gating.test.ts` | anon 307 to `/`, authed 200                                        |
| `/console`, `/console/docs`                   | `gating.test.ts` | anon 404 (never redirect), admin 200                               |
| `/api/console/search`                         | `gating.test.ts` | anon 404 empty body, admin 200                                     |
| `/api/search`                                 | `search.test.ts` | result shape, content matches, empty for unfindable/missing query  |
| `/robots.txt`                                 | `seo.test.ts`    | allow all, disallow api/console/dashboard, sitemap link            |
| `/sitemap.xml`                                | `seo.test.ts`    | exact URL set (home + docs + posts)                                |
| social metadata                               | `seo.test.ts`    | og/twitter tags, og:image resolves                                 |
| `/llms.txt`                                   | `llms.test.ts`   | markdown index with every docs page as `.md` link                  |
| `/llms-full.txt`                              | `llms.test.ts`   | AI preamble + full docs corpus                                     |
| `/llms.txt/docs/*`, `.md`/`.txt` rewrites     | `llms.test.ts`   | per-page markdown, rewrite parity, every docs page fetchable, 404s |
| `/og`, `/og/home`, `/og/docs/*`, `/og/blog/*` | `og.test.ts`     | PNG renders, query params, unknown slug 404                        |

### Interactions (`specs/e2e/`)

| Flow            | Spec                    | Behaviors locked                                                                        |
| --------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Docs search     | `docs-search.test.ts`   | open via trigger + Cmd/Ctrl+K, results, navigate, Escape, no-results                    |
| Navigation      | `navigation.test.ts`    | navbar links, docs sidebar, blog index to post, API Docs external link                  |
| Theme           | `theme.test.ts`         | smart toggle cycles, persists across reload                                             |
| Auth            | `auth.test.ts`          | Login dialog, agent login to dashboard, sign out re-locks, navbar swaps Login/Dashboard |
| Waitlist form   | `waitlist.test.ts`      | success state, field validation, honeypot invisible                                     |
| Organizations   | `organizations.test.ts` | create org from switcher, becomes active, cleanup via API                               |
| Console         | `console.test.ts`       | admin console + console docs render, dashboard renders for the agent                    |
| Landing widgets | `marketing.test.ts`     | API status badge operational, brand hero                                                |

## Out of scope (deliberate)

- A real 429: rate limiting keys on client IP, which is absent for localhost traffic, so every local request gets its own bucket (that fallback is itself locked in `system.test.ts`).
- Third-party redirect targets (GitHub/Google OAuth consent, PostHog, UserJot): only the handoff URL the app produces is asserted.
- Production-only behavior (`/headers` 403, hidden landing navbar, agents router absence): the suite runs against the local dev stack.
