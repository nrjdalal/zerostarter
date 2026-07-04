# Golden Test Suite

A black-box characterization suite that locks the app's entire observable surface: every API endpoint, every web route, and every user-facing interaction. It talks to the running stack over HTTP and a real browser only, never framework internals, so it survives a frontend or backend rewrite unchanged. If a migration (e.g. Next.js to TanStack Start) preserves behavior, this suite stays green; anything it catches is a regression by definition.

## Run

```bash
bun run test:golden          # from the repo root (starts the dev stack if it is not running)
bun run test                 # from tests/golden
bun run test:api             # API endpoints only
bun run test:web             # web routes only
bun run test:e2e             # browser interactions only
bun run report               # open the last HTML report (CI runs)
```

Requirements: the dev stack's Postgres reachable via `.env` `POSTGRES_URL`; web on `:3000` and api on `:4000` (override with `GOLDEN_WEB_URL` / `GOLDEN_API_URL`). A `setup` project waits for both servers, signs in the local agent once, and shares the session with every test.

Do not run `bun run build` (or commit, whose pre-commit hook builds) while the suite is running: the build writes into the same `.next` the dev server serves from and causes transient failures until the dev server resettles. The suite also writes a few `golden-*@example.com` rows to the local waitlist table; organizations it creates are deleted at the end of the test.

## Layout

- `src/surface.ts`: the pinned inventory (every route, title, endpoint, error code). When the surface changes on purpose, update this fixture in the same change.
- `src/helpers.ts`: agent sign-in, error envelope assertions, shared session plumbing.
- `specs/api/`: HTTP tests against the Hono API.
- `specs/web/`: HTTP tests against the Next.js routes and route handlers.
- `specs/e2e/`: Chromium tests for interaction flows.

## Coverage map

### API (`specs/api/`)

| Surface                                   | Spec                           | Behaviors locked                                                                                                             |
| ----------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET /`, `GET /headers`                   | `system.spec.ts`               | version + environment envelope; local header echo                                                                            |
| `GET /api/health`                         | `system.spec.ts`               | envelope shape, version format, rate limit headers                                                                           |
| 404 + method mismatch                     | `system.spec.ts`               | exact `{ error: { code, message } }` envelope                                                                                |
| CORS                                      | `system.spec.ts`               | preflight allow-list, credentials, untrusted origin gets nothing                                                             |
| Rate limiter                              | `system.spec.ts`, `v1.spec.ts` | anon 60/min headers, authed 120/min, per-IP keying                                                                           |
| `GET /api/openapi.json`                   | `openapi.spec.ts`              | exact path list, 429/500 everywhere, 401/400 where declared                                                                  |
| `GET /api/docs`                           | `openapi.spec.ts`              | Scalar UI serves and points at the spec                                                                                      |
| `POST /api/agents/sign-in-as`             | `agents.spec.ts`               | Origin required, trusted-origin check, cookie + 302, admin role, GET is 404                                                  |
| `GET /api/auth/providers`                 | `auth.spec.ts`                 | exact enabled provider list                                                                                                  |
| `GET /api/auth/get-session`               | `auth.spec.ts`                 | null anon, session + user authed                                                                                             |
| `POST /api/auth/sign-in/social`           | `auth.spec.ts`                 | GitHub + Google authorize URLs                                                                                               |
| `POST /api/auth/sign-out`                 | `auth.spec.ts`                 | session invalidated                                                                                                          |
| Better Auth CSRF                          | `auth.spec.ts`                 | credentialed POST without trusted Origin is 403                                                                              |
| `GET /api/auth/reference`                 | `auth.spec.ts`                 | Better Auth reference serves                                                                                                 |
| `GET /api/v1/session`, `GET /api/v1/user` | `v1.spec.ts`                   | 401 envelope anon; full shape + agent identity authed                                                                        |
| `GET /api/waitlist`                       | `waitlist.spec.ts`             | threshold + rounding rule (0 below 10, else floor to 5)                                                                      |
| `POST /api/waitlist`                      | `waitlist.spec.ts`             | ok, idempotent dup, trim/case, honeypot silent accept, 400 VALIDATION_ERROR (invalid, missing, too long), malformed JSON 400 |
| web `/api/*` proxy                        | `proxy.spec.ts`                | GET/POST/auth/error parity through `:3000`                                                                                   |

### Web routes (`specs/web/`)

| Surface                                       | Spec             | Behaviors locked                                                   |
| --------------------------------------------- | ---------------- | ------------------------------------------------------------------ |
| `/`, `/hire`, `/resume`, `/waitlist`          | `pages.spec.ts`  | 200 + exact `<title>`                                              |
| all 26 docs pages                             | `pages.spec.ts`  | 200 + exact title per page                                         |
| `/blog` + all 3 posts                         | `pages.spec.ts`  | index lists every post; each post renders                          |
| unknown page/docs/blog routes                 | `pages.spec.ts`  | 404                                                                |
| `/dashboard`                                  | `gating.spec.ts` | anon 307 to `/`, authed 200                                        |
| `/console`, `/console/docs`                   | `gating.spec.ts` | anon 404 (never redirect), admin 200                               |
| `/api/console/search`                         | `gating.spec.ts` | anon 404 empty body, admin 200                                     |
| `/api/search`                                 | `search.spec.ts` | result shape, content matches, empty for unfindable/missing query  |
| `/robots.txt`                                 | `seo.spec.ts`    | allow all, disallow api/console/dashboard, sitemap link            |
| `/sitemap.xml`                                | `seo.spec.ts`    | exact URL set (home + docs + posts)                                |
| social metadata                               | `seo.spec.ts`    | og/twitter tags, og:image resolves                                 |
| `/llms.txt`                                   | `llms.spec.ts`   | markdown index with every docs page as `.md` link                  |
| `/llms-full.txt`                              | `llms.spec.ts`   | AI preamble + full docs corpus                                     |
| `/llms.txt/docs/*`, `.md`/`.txt` rewrites     | `llms.spec.ts`   | per-page markdown, rewrite parity, every docs page fetchable, 404s |
| `/og`, `/og/home`, `/og/docs/*`, `/og/blog/*` | `og.spec.ts`     | PNG renders, query params, unknown slug 404                        |

### Interactions (`specs/e2e/`)

| Flow            | Spec                    | Behaviors locked                                                                        |
| --------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Docs search     | `docs-search.spec.ts`   | open via trigger + Cmd/Ctrl+K, results, navigate, Escape, no-results                    |
| Navigation      | `navigation.spec.ts`    | navbar links, docs sidebar, blog index to post, API Docs external link                  |
| Theme           | `theme.spec.ts`         | smart toggle cycles, persists across reload                                             |
| Auth            | `auth.spec.ts`          | Login dialog, agent login to dashboard, sign out re-locks, navbar swaps Login/Dashboard |
| Waitlist form   | `waitlist.spec.ts`      | success state, field validation, honeypot invisible                                     |
| Organizations   | `organizations.spec.ts` | create org from switcher, becomes active, cleanup via API                               |
| Console         | `console.spec.ts`       | admin console + console docs render, gated search in-session, dashboard                 |
| Landing widgets | `marketing.spec.ts`     | API status badge operational, brand hero                                                |

## Out of scope (deliberate)

- A real 429: rate limiting keys on client IP, which is absent for localhost traffic, so every local request gets its own bucket (that fallback is itself locked in `system.spec.ts`).
- Third-party redirect targets (GitHub/Google OAuth consent, PostHog, UserJot): only the handoff URL the app produces is asserted.
- Production-only behavior (`/headers` 403, hidden landing navbar, agents router absence): the suite runs against the local dev stack.
