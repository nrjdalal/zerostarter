---
name: web-spec
description: Run, extend, and validate the web/next behavioral spec suite for ZeroStarter — it asserts golden literals against a running app over HTTP/SSR plus a browser tier, so config drift fails a test instead of silently shifting the spec. Use when running the web tests, adding a spec for a new behavior, or debugging a spec failure.
---

# Web Spec Suite

`web/next/test/` is a black-box behavioral spec: it asserts golden literals against a running app over HTTP/SSR plus a browser tier, so config drift fails a test instead of silently shifting the spec. It is `BASE_URL`-portable: point it at any running build and a green run is the proof.

## Running

Runnable from repo root (thin `cd web/next && bun run …` delegators in the root `package.json`) or from `web/next` directly. Not turbo tasks: the suite needs live servers and the stack helper itself spawns `turbo run dev`, so wrapping it in turbo would nest it. Every script shares the stack lifecycle in `test/stack.ts` (`run.ts` for the test tiers, `visual.ts` for the visual one, `all.ts` for both under one boot): it starts the stack if down, reuses and leaves a running one, and tears down only what it started.

```bash
bun run test                # deterministic (non-browser) tiers; needs the live stack + DB.
                            # the dashboard/feedback/api tiers sign in via the idempotent
                            # agent upsert, so it is not a pure read-only run.
bun run test:e2e            # full behavioral run: browser interactions plus the authed
                            # dashboard/feedback tiers (agent sign-in); needs the
                            # agent-browser CLI
bun run test:visual         # pixel-diff each page vs a baseline (CSS/layout parity)
bun run test:visual:update  # (re)capture baselines from the current BASE_URL
bun run test:all            # the whole suite in one boot: behavioral then visual;
                            # needs a baseline first (test:visual:update)
```

- Use `bun run test`, not `bun test`. `bun test` is Bun's built-in runner: it ignores the script, so it skips the orchestrator (no stack management, no env gates) and runs every tier regardless.
- `test/run.ts` manages only what it starts. Stack already up: reuse it, leave it running. Stack down: `bun dev` it, run, then stop it. SIGINT/SIGTERM and a crashed run still tear down what it launched; it refuses to start if a port is held by a non-ZeroStarter process.

## Visual parity (the axis HTTP can't see)

HTTP/SSR assertions are blind to CSS and layout, so `test/visual.ts` screenshots each page x viewport x theme via agent-browser and pixel-diffs against a baseline with sharp (differing pixels rendered magenta into `test/screenshots/diff/`). Baselines are machine-specific (font rendering), so `test/screenshots/` is gitignored: regenerate locally before comparing.

```bash
bun run test:visual:update                          # capture golden baselines
BASE_URL=http://localhost:3101 bun run test:visual  # diff another build vs the golden
```

### Contract vs implementation detail

The suite pins only observable behavior, never framework-specific implementation. Deliberately NOT pinned:

- Exact redirect status codes (the portable contract is `3xx` + the redirect target, not `307` vs `308`).
- The framework-default 404 `<title>` (the contract is the 404 status + the body copy).
- Font preload `<link>`s and next/font class names (appearance is the visual layer's job).
- Per-page meta descriptions (the 29 docs drift often): titles are pinned exactly, descriptions are only asserted present.

Pinned despite looking internal, because they are part of the shared contract: the fumadocs DOM markers, the `llms.txt` section structure, the `robots.txt` body, and the OG image dimensions/cache headers.

## Env flags

| Var | Default | Effect |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3000` | the app under test |
| `API_URL` | `http://localhost:4000` | the Hono API (proxy/search/agents/dashboard tests need it) |
| `TEST_MODE` | `dev` | `prod` flips the agents-login expectation (set it only against a production build) |
| `BROWSER_TESTS` | unset | `true` enables the browser tier (set by `test:e2e`) |

## Auth and self-cleanup

The dashboard and feedback tiers sign in via the local `/api/agents/sign-in-as` endpoint, which is origin-gated and local-only (see `api.test.ts`). It upserts a single agent user (`agent@zerostarter.dev` / `AgentZero`), so it leaves no per-run residue: there is nothing to clean up. ZeroStarter has no DB-writing test, so there is no `ALLOW_DB_WRITES` gate and no smoke-row cleanup.

## Layout

| File | Covers |
| --- | --- |
| `helpers.ts` | base URLs, `req`/`get` (429-retrying), head/PNG parsers, content inventory, `signInAsAgent`, tier-wide timeout |
| `routing.test.ts` | status/HEAD, 404s, trailing-slash, favicon, protected `/dashboard` redirect |
| `content.test.ts` | `robots.txt` + `sitemap.xml`, the llms.txt family, `.md`/`.txt` aliases |
| `meta.test.ts` | title template, OpenGraph/Twitter sets, page content markers |
| `og.test.ts` | OG PNG (1200x630 + size floor + cache), param truncation, 404s |
| `api.test.ts` | proxy semantics (og-exclusion edges), search, auth + system endpoints, agents origin gating |
| `dashboard.test.ts` | authed SSR markers, `sidebar_state` cookie, session passthrough |
| `feedback.test.ts` | USERJOT conditional (docs footer + dashboard menu agree) |
| `browser.test.ts` | theme cycle, login dialog, Cmd-K search, copy-as-markdown, sidebar, mobile |
| `stack.ts` | shared stack lifecycle (ensure-up, port guard, reuse-or-start, teardown) |
| `run.ts` | test-tier wrapper over `stack.ts` |
| `visual.ts` | visual-parity capture + sharp diff (uses `stack.ts`); exports `visualParity` |
| `all.ts` | `test:all`: behavioral suite + visual diff under one `ensureStack` |

## Gotchas

- Golden literals are intentional: a copy/title/route change should fail a test. Update the `helpers.ts` inventory when content lands.
- `setDefaultTimeout` covers tests, not hooks: `beforeAll` hooks that sign in or fetch carry explicit `30_000` timeouts, since the 429 retry budget can exceed the 5s hook default.
- base-ui triggers ignore synthetic `.click()`: `clickByName` resolves a snapshot ref and does a real CDP click against an interactive role, so a same-named heading never shadows its button.
- Clipboard write throws in headless (document-not-focused): copy-as-markdown asserts the affordance, not the post-write state.
- The browser tier polls, not sleeps: interactions wait via `waitFor(boolExpr)` (returns the moment the condition holds), so it is fast and stable enough; the only blocking dep is the agent-browser CLI.

## Notes

- Not wired into turbo/CI: it needs live servers. `check-types` does cover the tests via `tsc -p test/tsconfig.json`, chained into the package `check-types`.
- The agent session for the dashboard/feedback hooks comes from the local `/api/agents/sign-in-as` endpoint; it is origin-gated (see `api.test.ts`).
