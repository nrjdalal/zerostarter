# ZeroStarter, tracked against the external evaluation

- Status: in progress (P0)
- Source: [nrjdalal/saas-starter-evals](https://github.com/nrjdalal/saas-starter-evals), `ZEROSTARTER-RECOMMENDATIONS.md` (repo inspected at v0.1.2)
- Executes via: [hardening-refactors.md](hardening-refactors.md) (the P0 sprint)

An evidence-based external evaluation of the starter: a source inspection, an AI-agent build benchmark, a monetization analysis, and a security audit. Its backlog is captured here as the roadmap. Each item keeps the eval's priority (P0 security/correctness down to P3 recipes) and classification (`core` / optional `pkg` / `recipe`). File paths were from v0.1.2; re-verify against the current tree before acting.

Preserve the six strengths the eval measured while working it: accurate docs, verified end-to-end type safety, the upstream-update path (`init`/`reinit`/`sync`), the OpenAPI-documented rate-limited API, ops hygiene, and one canonical way per task. A capability may go in core; a specific vendor goes in an optional package or a recipe, never as a hard core dependency, and a fresh keyless clone must still install and run.

## P0: Security & correctness

- **P0-1 · Re-gate the agent sign-in route** [core] · **done** (#698). Mounts only with `AGENT_SIGNIN_ENABLED=true` (off by default); a default clone exposes no admin-minting route, and the UI button follows the same gate. (#695 proposed gating on an `AGENT_AUTH_SECRET` instead and was closed unmerged; the toggle shipped in its place.)
- **P0-2 · Remove the polyfill secret fallback** [core] · **done** (#696). `BETTER_AUTH_SECRET` is read directly and fails closed when required; no constant is substituted under the skip flag.
- **P0-3 · Product test harness, gated in CI** [core] · **partial**. The CI half is done (#694 runs `check-types` + `test` on every PR); the harness itself (a disposable-Postgres integration layer + Playwright e2e, with example auth-flow / org-scoped / cross-tenant-denial / migration-smoke tests) is not built. Building it un-parks the route/env regression tests deferred from #698/#696.
- **P0-4 · Security headers/CSP + a durable rate-limit store** [core] · **not started**. No security headers or CSP anywhere; the rate limiter uses the in-memory store (a no-op on serverless). Add default headers + CSP (report-only, then enforce) and a Postgres-backed durable store. Related: the anonymous IP key is on ice in [rate-limit-client-ip.md](rate-limit-client-ip.md); it is spoofable today and fails open when no IP resolves, and the trusted-proxy decision it needs is cheapest to make alongside the durable store here.

## P1: Adoption blockers

- **P1-2 · Email port in core, vendor adapters as optional packages** [core interface + pkg] · **not started**. There is no email layer at all, which blocks invitations, verification, and receipts. A provider-agnostic interface plus a keyless dev transport in core; Resend and SES/SMTP as optional packages.
- **P1-1 · Org-scoping primitive + member UI + invitations** [core] · **not started**, depends on P1-2. The org plugin and tables exist but there is no `requireOrgMember`-style helper, no member UI, and no invitation delivery. The single biggest B2B unlock. Related: [org-creation-restrictions.md](org-creation-restrictions.md) (#349).
- **P1-3 · Fix clean-clone DX defects** [core] · **partial**. Fresh-clone `check-types` friction is partly addressed (#694 self-heals the docs `meta.json`); the dev-server wedge on build-while-dev and the silent `:3001` port fallback remain.

## P2: Revenue path & self-imposed taxes

- **P2-1 · Official billing package (Stripe first)** [pkg + recipe] · **not started**, depends on P1-1, P1-2, P0-4. Verified, idempotent subscriptions with checkout, portal, and a server-side entitlement gate that composes with the org-scoping primitive; the webhook route exempt from the global limiter.
- **P2-2 · Generate OpenAPI schemas from the Zod validators** [core] · **in progress** (PR #700). Removes the hand-written `describeRoute` duplication (~38% of new router code in the benchmark) and the validator/OpenAPI drift risk.
- **P2-3 · Generate the doc-sync enumeration files from source** [core] · **not started**. Generate the router/schema/script enumerations so `doc-sync` verifies generated content instead of demanding hand edits; keep prose human-authored.
- **P2-4 · Address the types-through-`dist` staleness** [core] · **not started**. `AppType` flows through built `dist`, so a stale build yields stale client types; resolve to source or make staleness fail loudly.

## P3: Official recipes

- **P3-1 · Recipes: background jobs (pg-boss), file uploads (S3), Sentry, audit-log** [recipe] · **not started**. Documented adapters, not core deps. Related: [deployment-adapters.md](deployment-adapters.md) (#154).
- **P3-2 · A Node-runtime compatibility path, or an ADR against it** [recipe/ADR] · **not started**. `import { SQL } from "bun"` hard-locks to Bun, the top adoption objection; provide a Node path or an honest ADR. Related: [tanstack-start-migration.md](tanstack-start-migration.md).

## The eval's explicit non-goals (§5)

The eval lists things it argues should **not** go in core, because each recreates the bloat/lock-in it penalized in the feature-complete competitors. These are decided non-goals, not undecided ice: a bundled payment provider or email vendor in core (both live as packages/recipes above); analytics beyond the existing hooks, a CMS, general-purpose feature flags, i18n by default, onboarding flows, plan/entitlement matrices, multi-database support; and any second way to do a task that already has a canonical one. The test: if it forces a fresh keyless clone to depend on a third-party vendor, or adds a second pattern for an existing task, it is a recipe or an optional package, not core.

## Sequencing (eval §6)

P0-1/P0-2 first (done), then **P0-3** (it unblocks confident work on everything after), then P0-4 to close the security floor. Then P1-2 before P1-1 (invitations need email), then the rest of P1. P2-1 (billing) after P1-1/P1-2/P0-4. P2-2/P2-3/P2-4 remove self-imposed taxes and make later work cheaper, so slot them in early when they annoy. P3 recipes are opportunistic.
