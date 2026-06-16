# Deep Audit (2026-06-16)

- **Commit audited:** `7219d3f`
- **Scope:** whole repo, every package (deep). `api/hono`, `web/next`, `packages/{auth,db,env,tsconfig}`, `.github/`.
- **Method:** recon, then nine-category audit fanned out across parallel read-only passes, then manual vetting of every finding against the cited code. Over-reported items were rejected (see the bottom of this doc).
- **Status:** findings only. Nothing here has been implemented. Each finding is written to be actionable later without prior context.

This document consolidates and supersedes the prior `.github/reviews/` audit notes, which are removed in the same change. The durable decisions from those notes are preserved under "Settled decisions to preserve" below so they are not re-litigated.

## Summary

ZeroStarter is in good shape and has clearly improved since the prior reviews (the repo moved from 0.0.9 to 0.0.24). Most of the critical items raised in `2025-12-26-cursor-composer-1.md` are genuinely fixed: a global error handler exists (`api/hono/src/lib/error.ts`), rate limiting is implemented, the health endpoint no longer dumps the env object, `.env.example` exists, and the previously flagged `console.log` is now gated to local only. The codebase is disciplined: zero `any`, zero `@ts-ignore`, zero non-null assertions, zero stray TODO markers in source, `cookieCache` is enabled, and the detailed docs are honest about what is and is not wired.

The remaining opportunities cluster in three places:

1. **Verification baseline.** There are no tests, and the CI "lint" step runs nothing while type checking is never run in CI. For a starter that markets best practices, this is the highest-leverage gap.
2. **Two shipped-but-incomplete surfaces.** The magic-link login is the most prominent sign-in option but is non-functional out of the box, and the README advertises two features the detailed docs correctly disclose as not wired.
3. **Production hardening.** No security response headers, an unauthenticated image-render endpoint, and a stale dependency with moderate advisories.

## Findings

Ordered by leverage (impact divided by effort, weighted by confidence). Evidence was read and confirmed directly, not taken from tooling output alone.

| #   | Finding                                                                 | Category      | Impact | Effort | Risk | Confidence |
| --- | ----------------------------------------------------------------------- | ------------- | ------ | ------ | ---- | ---------- |
| F1  | CI verification gates are hollow: `bun run lint` runs zero tasks, and `check-types` never runs in CI | dx            | HIGH   | S      | LOW  | HIGH       |
| F2  | No test infrastructure anywhere                                         | tests         | HIGH   | M      | LOW  | HIGH       |
| F3  | Magic-link is the most prominent login option but is non-functional     | bug/direction | HIGH   | S to M | LOW  | HIGH       |
| F4  | No security response headers on the Next.js app                         | security      | MED    | M      | MED  | HIGH       |
| F5  | README overclaims features the detailed docs disclose as not wired      | docs          | MED    | S      | LOW  | HIGH       |
| F6  | Bump `hono` to clear four moderate advisories (bump, not override)      | deps/security | LOW    | S      | LOW  | HIGH       |
| F7  | Author's personal content ships in a clonable starter template          | tech-debt     | MED    | M      | LOW  | HIGH       |
| F8  | Unauthenticated `/og` route renders arbitrary text to PNG, no limits    | perf/security | MED    | S to M | LOW  | MED        |
| F9  | Duplicated env boilerplate (trusted-origins transform copied verbatim)  | tech-debt     | LOW    | S      | LOW  | HIGH       |
| F10 | Org-activation fetch forwards all inbound headers and swallows errors   | bug           | LOW    | S      | LOW  | HIGH       |
| F11 | `maxLifetime: 0` and no explicit pool `max` for the serverless target   | perf          | LOW    | S      | LOW  | MED        |
| F12 | Misc hygiene bundle                                                     | dx/tech-debt  | LOW    | S      | LOW  | HIGH       |

---

### F1. CI verification gates are hollow

- **Category:** dx
- **Evidence:**
  - `package.json:33` defines `"lint": "turbo run lint --summarize"`, and `turbo.json:20` defines an empty `"lint": {}` task, but no workspace (`api/hono`, `web/next`, `packages/*`) defines a `lint` script. `turbo run lint` therefore executes zero tasks ("No tasks were executed as part of this run").
  - Oxlint only runs locally on staged files via the lefthook pre-commit `lint-staged` step (`.lintstagedrc.json`). Commits made through the GitHub web UI, rebases, or merges bypass it entirely.
  - `.github/workflows/auto-check-build.yml:26-30` runs `bun audit --audit-level high`, `bun run lint` (the no-op above), and `bun run build`. It never runs `bun run check-types`.
- **Impact:** The CI pipeline reports a passing "Lint" step while linting nothing. Type regressions are only caught incidentally by `next build` and `tsdown`, not by the dedicated `check-types` task. For a template whose product is developer experience, the pipeline gives false confidence.
- **Effort:** S
- **Risk:** LOW. Wiring oxlint may surface a one-time batch of pre-existing lint issues to fix.
- **Fix sketch:** Add a `lint` script to each workspace (for example `"lint": "oxlint"`) so `turbo run lint` actually runs, or define a single root oxlint invocation. Add a `bun run check-types` step to `auto-check-build.yml`. Confirm `bun run lint` reports executed tasks and a clean result.

---

### F2. No test infrastructure anywhere

- **Category:** tests (verification baseline)
- **Evidence:** No `*.test.*` or `*.spec.*` files exist in the repo. No `test` script in any `package.json`. No `test` task in `turbo.json`. The runtime is Bun, so `bun test` is a zero-config starting point.
- **Impact:** There is no one-command way to know the codebase is healthy beyond a successful build. Auth, rate-limit, and env logic ship unverified, and there is no safety net for refactors. For a starter that advertises battle-tested patterns, the absence of even example tests undercuts the positioning. This is the prerequisite that unblocks safer work on the other findings.
- **Effort:** M (infrastructure plus a first set of high-value tests).
- **Risk:** LOW. Adding a runner and tests cannot break runtime behavior; the main risk is writing shallow tests that assert nothing.
- **Fix sketch:** Add `bun test` wiring (root `test` script plus a `turbo` task) and write the first tests against pure, already-documented functions for maximum risk reduction per effort:
  - `getCookieDomain` / `getCookiePrefix` in `packages/auth/src/lib/utils.ts` (both carry JSDoc input/output examples that translate straight into assertions).
  - The `HONO_TRUSTED_ORIGINS` comma-split transform in `packages/env/src/api-hono.ts` and the Docker `localhost` rewrite in `packages/env/src/db.ts`.
  - `generateRateLimitKey` in `api/hono/src/middlewares/rate-limiter.ts` (the userId, then apiKey, then IP fallback branches).
  - `errorHandler` in `api/hono/src/lib/error.ts` (Zod error vs generic, and the local vs production message gate).
  - `getBuildVersion` in `packages/env/src/lib/constants.ts`.

---

### F3. Magic-link is the most prominent login option but is non-functional out of the box

- **Category:** bug / direction
- **Evidence:**
  - `web/next/src/components/access.tsx:49-64` and `:85-128` render the email magic-link form as the first and most prominent option in the login dialog, calling `authClient.signIn.magicLink(...)`.
  - `web/next/src/lib/auth/client.ts:8` registers `magicLinkClient()`.
  - `packages/auth/src/index.ts:59-64` registers only `openAPI()` and `organization()` on the server. There is no `magicLink()` server plugin, and there is no email sender (`.env.example` has no email or SMTP variables).
- **Impact:** Better Auth requires the `magicLink()` server plugin plus a `sendMagicLink` sender for `signIn.magicLink` to work. As shipped, a fresh clone's most prominent login path errors at runtime. OAuth (GitHub, Google) still works, so this is a broken primary option rather than a total auth outage. The detailed docs (`authentication.mdx:14`) are honest that this is "not functional out of the box," but the shipped UI presents it as the default path.
- **Effort:** S to gate the UI; M to L to wire it end to end (depends on choosing and integrating an email provider).
- **Risk:** LOW.
- **Fix sketch:** Two viable directions:
  - **Gate (S):** hide or disable the magic-link form until an email provider is configured (mirror the `isDev` gate used for the agents button at `access.tsx:133`), so the shipped login has no dead path.
  - **Wire (M to L):** add the `magicLink()` server plugin to `packages/auth/src/index.ts`, implement `sendMagicLink` against an email provider (Resend is the roadmap Phase 1 choice), and add the provider env to `packages/env` and `.env.example`. This also unblocks email verification and org invitations (see direction D1). Pair with F5.

---

### F4. No security response headers on the Next.js app

- **Category:** security
- **Evidence:** `web/next/next.config.ts` exports no `headers()` function. There is no Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy. The Hono API sets none either. The `/console` admin area and the auth dashboard render from this app.
- **Impact:** No clickjacking, MIME-sniffing, or transport hardening for an app that markets itself as production ready. The admin console is framable, and there is no CSP to limit the blast radius of any future injection on a privileged page.
- **Effort:** M
- **Risk:** MED. A CSP that is too strict can break PostHog, the Scalar docs page, and inline styles, so it needs testing. Start with the unambiguous headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS) and add CSP in report-only mode first.
- **Fix sketch:** Add an async `headers()` in `next.config.ts` returning a baseline header set for all routes, with a stricter `frame-ancestors 'none'` for `/console`. Validate PostHog and `/api/docs` still load, then promote CSP from report-only to enforcing.

---

### F5. README overclaims features the detailed docs disclose as not wired

- **Category:** docs
- **Evidence:** `README.md:54` lists "magic links" and `README.md:58` lists "per-user, per-API-key, and per-IP rate limiting" under "Implemented Features" (also repeated at `README.md:24` and `:75`). The detailed docs are accurate the other way: `authentication.mdx:14` says magic link is not functional out of the box, and `api-conventions.mdx:90` says the API-key rate-limit tier "is dead until you wire `getApiKey` into a limiter."
- **Impact:** The README is the clone decision-point and the most-read doc. Listing not-yet-wired features as implemented contradicts the honest detailed docs and erodes trust in a best-practices template.
- **Effort:** S
- **Risk:** LOW
- **Fix sketch:** Reword the README feature list to match reality: either move magic links and per-API-key limiting to a "planned" framing, or qualify them ("magic-link UI present, server wiring optional"). Keep it consistent with `authentication.mdx`, `api-conventions.mdx`, and `roadmap.mdx`.

---

### F6. Bump `hono` to clear four moderate advisories (bump, not override)

- **Category:** deps / security
- **Evidence:** `package.json:112` pins `hono` to `^4.12.21` in the catalog, and `bun.lock` resolves `4.12.21`. `bun audit` (all levels) reports four moderate Hono advisories: IP-restriction IPv6 bypass (GHSA-xrhx-7g5j-rcj5), cookie helper Set-Cookie injection (GHSA-3hrh-pfw6-9m5x), JWT scheme acceptance (GHSA-f577-qrjj-4474), and `app.mount()` prefix stripping (GHSA-2gcr-mfcq-wcc3). `bun audit --audit-level high` is clean (these are moderate).
- **Impact:** Reachability is LOW: the cookie helper is used only in the local-only `agents.ts` with constant attribute values; the app uses neither Hono's IP-restriction middleware, its `bearerAuth`, nor `app.mount()`. The value is a clean full audit and staying current. Aligns with the project's preference to bump rather than add an override.
- **Effort:** S
- **Risk:** LOW (patch within the same minor).
- **Fix sketch:** Bump the catalog `hono` floor to the latest 4.12.x, run `bun install`, then confirm `bun audit` no longer lists the four Hono advisories. The change is self-verifying.

---

### F7. Author's personal content ships in a clonable starter template

- **Category:** tech-debt / direction
- **Evidence:** `web/next/src/app/hire/page.tsx` (352 lines) and `web/next/src/app/resume/page.tsx` (320 lines) are the author's personal hire and resume pages, and `web/next/content/blog/a-biography-written-in-code.mdx` is a personal biography. The README promotes cloning via `bunx gitpick`, so every clone inherits this content.
- **Impact:** Users cloning the starter inherit pages that advertise someone else's career and a personal blog post, which is cleanup burden and dilutes the "generic starter" positioning. This is a decision rather than a defect: the repo is also the author's live site (zerostarter.dev), so the content may be intentional dogfooding.
- **Effort:** M
- **Risk:** LOW (routes are isolated).
- **Fix sketch:** Decide the repo's identity. If it is a clean starter, extract the personal pages and biography into clearly labeled example placeholders and update nav/sitemap. If it is the author's dogfooded site, document in the README that cloners should remove `/hire`, `/resume`, and the biography post.

---

### F8. Unauthenticated `/og` route renders arbitrary text to PNG with no page-binding or rate limit

- **Category:** perf / security
- **Evidence:** `web/next/src/app/og/route.tsx:6-14` is `force-dynamic` and renders any `title`/`description`/`section` query value (sliced to 100/200 chars) into a 1200x630 PNG via `takumi-js` (`web/next/src/lib/og-image.tsx`). The `/og/docs/[[...slug]]` and `/og/blog/[[...slug]]` routes are bound to real page slugs (they call `notFound()` for unknown ones), but `/og` itself accepts arbitrary input. Next.js app routes are not covered by the Hono rate limiter.
- **Impact:** An open per-request PNG render is a CPU and cost vector on Vercel. Distinct query strings bust the one-year CDN cache, so scripted random titles force unbounded renders. Legitimate usage is bounded (only the personal pages reference `/og` directly), so this is modest, but the surface is real.
- **Effort:** S to M
- **Risk:** LOW
- **Confidence:** MED
- **Fix sketch:** Bind `/og` to known content the way `/og/docs` and `/og/blog` already do, or add a short-lived render cache plus a request limit. Optionally drop the raw `/og` route if the slug-bound routes cover the real need.

---

### F9. Duplicated env boilerplate (trusted-origins transform copied verbatim)

- **Category:** tech-debt
- **Evidence:** `packages/env/src/api-hono.ts:14-17` and `packages/env/src/auth.ts:16-19` contain the identical `HONO_TRUSTED_ORIGINS` string-to-URL-array transform, plus repeated `NODE_ENV` runtimeEnv mapping.
- **Impact:** A change to the transform must be made in two places, risking drift. Minor, but it is a visible DRY wart in a template meant to exemplify clean code.
- **Effort:** S
- **Risk:** LOW
- **Fix sketch:** Extract a shared `trustedOrigins` Zod schema (for example in `packages/env/src/lib/`) and import it in both files. Cover it with a unit test (see F2).

---

### F10. Org-activation fetch forwards all inbound headers and swallows errors silently

- **Category:** bug (minor)
- **Evidence:** `web/next/src/app/(protected)/layout.tsx:17-29` spreads every inbound request header into an internal `POST` to set the active organization, then ends with `.catch(() => {})`.
- **Impact:** Forwarding the full inbound header set (including `host`) into an internal POST is a smell; the content-length concern is theoretical here because the inbound navigation is a GET with no body. The empty catch hides genuine failures (the user silently loses their active-org selection with no log).
- **Effort:** S
- **Risk:** LOW
- **Fix sketch:** Forward only the headers actually needed (cookie, and any auth headers), and replace the empty catch with a logged best-effort failure so the swallow is intentional and observable.

---

### F11. `maxLifetime: 0` and no explicit pool `max` for the serverless target

- **Category:** perf
- **Evidence:** `packages/db/src/index.ts:16-36` constructs the Bun `SQL` client with `maxLifetime: 0` in both the production and dev branches and sets no explicit `max` pool size. (Flagged in the 2025-12-26 review and left unchanged since.)
- **Impact:** `maxLifetime: 0` means busy connections never recycle, which is a blind spot for database failovers and credential rotation; pool size relies on the Bun default. `idleTimeout: 30` mitigates the original "connections never close" concern for idle connections, so the residual risk is modest, especially on Vercel where instances are recycled.
- **Effort:** S
- **Risk:** LOW
- **Confidence:** MED
- **Fix sketch:** Set an explicit `max` appropriate to the deployment target and a finite `maxLifetime` (for example 5 minutes) so connections cycle. Validate against the chosen Postgres provider's connection limits.

---

### F12. Misc hygiene bundle

- **Category:** dx / tech-debt
- **Evidence and items (all LOW, suitable to batch):**
  - `.github/scripts/deps-manager.ts:3` carries a stale `// TODO: AI-generated script, replace later.` on a 227-line script that is in active use. Either remove the marker and add a one-line purpose comment, or schedule the rewrite.
  - `date-fns` is declared in `web/next/package.json` but is not imported anywhere under `web/next/src`. Remove it (it is trivially re-addable).
  - `INTERNAL_API_URL` is an optional server var in `packages/env/src/web-next.ts:10` but is absent from `.env.example`. Add it with a comment.
  - No `.editorconfig` at the repo root, so non-VS Code editors get no formatting guidance for a template that advertises code quality.
  - `.oxlintrc.jsonc` has no rule configuration beyond `$schema` and `ignorePatterns`. Oxlint defaults are reasonable, so this is optional, but a few explicit rules would signal the template's linting stance.
  - Console page-gating is fragile for future pages: `assertConsoleAccess()` runs in the `(console)` layout, and the only current page reads static console docs, so there is no present vulnerability, but a future console page that reads user data must gate itself (the existing code comment already notes this). Consider a lint or convention to enforce it.
  - The rate-limit key fallback `findIp(...) || randomUUIDv7()` (`rate-limiter.ts:18`) gives each unkeyable request a unique bucket. It is documented as intended (`api-conventions.mdx:88`), but it means such requests are effectively unlimited and add unbounded in-memory keys on long-lived instances. Low concern on Vercel; note for self-hosted.
- **Effort:** S
- **Risk:** LOW

## Direction

Options to weigh, not problems ranked against the findings above. Each is grounded in repo evidence.

- **D1. Finish magic-link by wiring an email provider (Resend).** Strongest grounded next step. The client plugin and login UI already exist (see F3), the roadmap lists Resend as Phase 1 (High), and email also unblocks verification and org invitations (the docs describe "invite via email," but nothing can send today). Effort M. Trade-off: adds a managed email dependency.
- **D2. Wire API-key authentication.** The rate limiter already carries a `getApiKey` hook built for a capability that does not exist (`rate-limiter.ts:10,15`), and the prior perf audit listed this as TODO #8. Better Auth ships an `apiKey` plugin that provides creation, verification, expiry, and per-key limits. This enables CI, scripts, and server-to-server access. Effort M, low risk (a separate auth path from sessions).
- **D3. Build out the empty dashboard and console shells.** `web/next/src/app/(protected)/dashboard/page.tsx` and `web/next/src/app/(console)/console/page.tsx` both return `null`. The `/console` infrastructure (access model on the `user.console` field, gated docs, an incident-response runbook) just landed in PR #464; the natural next step is real internal ops tooling (user and org lookup), possibly via Better Auth's `admin` plugin. Effort M to L.

## Dependency ordering

- F1 (real CI gates) and F2 (tests) together form the verification baseline. F1 is config-only and should land first so CI actually runs the tests that F2 adds.
- F3's "wire it" path depends on D1 (email integration). The "gate the UI" path does not.
- F5 (README) should land alongside whichever F3 direction is chosen so the docs and the shipped behavior agree.

## Settled decisions to preserve (from the removed `.github/reviews/` notes)

These were investigated previously and intentionally kept. They are recorded here so they are not re-proposed as findings. If the code later drifts from any of these, that drift is itself a finding.

- **Two-step API bundle** (tsdown then `bun build` into a single file): intentional. It yields a single file with zero `node_modules` and a minimal Docker image. The roughly one percent size difference from alternatives is negligible.
- **`hono/logger` in production:** kept for observability. Structured JSON logging with request IDs is a worthwhile future initiative but was deliberately deferred, not rejected.
- **Two rate limiters** (IP-keyed global at the base limit, plus a user-keyed authenticated limiter at twice the limit): intentional separate buckets, not accidental double limiting.
- **OpenAPI and Scalar served in production:** intentional. This is an API-first platform where live API docs are part of the product. The startup cost is one-time.
- **`dotenv` loaded in production:** negligible one-time startup cost.
- **`@arcjet/ip` dependency:** kept. It correctly handles multi-proxy IP chains and provider-specific headers, which a naive header read does not.
- **Auth session caching:** addressed. `cookieCache` is enabled (`packages/auth/src/index.ts`, maxAge 300), so `auth.api.getSession` no longer hits the database on every authenticated request.
- **Earlier audit advisories (kysely, esbuild):** addressed via overrides. The current `esbuild` override is documented with exit criteria in `AUDIT.md` and remains necessary until `drizzle-kit` ships a release depending on `esbuild >= 0.28.1`.

## Considered and rejected

Recorded so they are not re-audited.

- **Landing-page Shiki "per-request SSR latency" and "recharts/embla dead bundle weight":** `web/next/src/app/page.tsx` is statically rendered (it uses no dynamic APIs), so `codeToHtml` runs at build time, not per request. recharts and embla are not imported by that page, and Next.js code-splits per route, so they do not ship on the landing route.
- **Next.js rewrite `:path` vs `:path*`** in `next.config.ts`: Next.js auto-forwards query strings and interpolates the full catch-all path, and the app's OAuth and API flows work, so this is not a defect. Cosmetic at most.
- **`agents.ts` NODE_ENV bypass:** the endpoint is correctly gated (it returns `notFound()` when not local and requires a trusted Origin) and is a documented local-only dev tool. The residual risk is "do not set NODE_ENV=local in production," which is already documented. Defense-in-depth note only.
- **CORS with `credentials: true` and an empty origins array:** the env schema (`z.array(z.url())`) rejects an empty or invalid value at boot, so the misconfiguration cannot reach the CORS middleware.
- **`console` field nullability:** `input: false` already blocks self-assignment via the Better Auth API; tightening the type is speculative.
- **Transitive moderate advisories** (dompurify via PostHog, js-yaml via fumadocs and commitlint, postcss, qs, babel): low-signal per the audit policy. They are build-time or internal to third-party libraries and are not reachable by app code, and `bun audit --audit-level high` (the repo's gate) is clean. Only `hono` (F6) is a direct, worth-bumping dependency.
- **Social-login loader not reset on success** (`access.tsx`): success triggers navigation and unmount, so the lingering loader state is benign.
- **OG silent truncation** to 100/200 chars: intentional layout cap.
- **Structured logging / request IDs:** explicitly deferred by the prior perf audit as a separate initiative; a known backlog item rather than a finding.

## Appendix: verification commands

Read-only commands used during this audit (and useful when acting on the findings):

- Typecheck: `bun run check-types`
- Build: `bun run build`
- Dependency audit: `bun audit` and `bun audit --audit-level high`
- Format check: `bun run format:check`
- Lint (currently a no-op, see F1): `bun run lint`
