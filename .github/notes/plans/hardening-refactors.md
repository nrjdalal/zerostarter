# Hardening refactors from the external evaluation

- Status: in progress
- Links: external SaaS-starter evaluation (nrjdalal/saas-starter-evals), `ZEROSTARTER-RECOMMENDATIONS.md` §4, PR #823 (the agent route's end-to-end test)

A set of small, self-contained refactors surfaced by an external, evidence-based evaluation of the repo (at v0.1.2). Each is its own PR into canary, verified end to end. Preserve the evaluation's noted strengths: the agent-DX login is a differentiator (tighten the gate, keep the route); one canonical way; docs in sync.

## Gate check-types and tests in PR CI [done first]

The PR gate (`auto-check-build.yml`) ran `audit + lint + build` only, so a type error the build tolerates or a failing test surfaced only in the release workflow after merge. Add a turbo `test` task + a root `test` script, run `check-types` + `test` in the PR gate, and make `web/next` `check-types` self-sufficient (generate the docs `meta.json` like `dev`/`build` do) so a fresh checkout type-checks.

## Read the auth secret directly and fail closed when required

`packages/env/src/auth.ts` substituted a placeholder for a missing `BETTER_AUTH_SECRET` under `SKIP_ENV_VALIDATION`. A security secret should never resolve to a constant. Add a `serverSecret()` helper: under the skip flag the schema is optional (a tooling build passes with `undefined`), otherwise it stays required, failing closed at runtime. Read the raw `process.env` value.

## Gate the agent sign-in route behind an explicit toggle

`api/hono/src/routers/agents.ts` `/api/agents/sign-in-as` (the local-only agent login) was gated on `NODE_ENV=local`, which is the `.env.example` default, so it could stay reachable in a default self-host. Add an `AGENT_SIGNIN_ENABLED` toggle (off by default) and mount the route only when it is true, so agent login is opted into deliberately in dev and a default env never exposes it. Thread it through `packages/env`, `.env.example`, `AGENTS.md`, and the `dev`/docs. The deferred route test lands with the product-test harness below.

To keep the agent-DX differentiator intact, `packages/cli` `seedEnv` also sets `AGENT_SIGNIN_ENABLED=true` in the scaffolded project's `.env` alongside a generated `BETTER_AUTH_SECRET`, so `bunx zerostarter init` yields working agent login out of the box. This only touches the gitignored `.env`, never the committed `.env.example`, so clone/deploy defaults stay off and the `isLocal(NODE_ENV)` gate keeps the toggle inert on a real deploy.

## Larger, tracked separately

Default security headers/CSP + a durable rate-limit store, and a full product-test harness (Playwright e2e + example org-scoped tests, where the deferred route/env tests land), are larger; scope them after these.

Since 2026-09-06 `tests/api/hono/src/routers/agents.e2e.test.ts` (`bun run test:e2e`) drives the route on a running stack: an untrusted Origin is refused and a trusted one mints a session. The env-shape tests still wait for the harness.
