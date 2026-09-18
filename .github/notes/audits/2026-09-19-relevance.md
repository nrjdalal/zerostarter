# Relevance audit (2026-09-19)

The two sweeps before this one (#830, #844) asked whether what the docs say is true. This one asks a different question: is each thing still relevant? Plans that shipped or died, audits never closed, a public roadmap that promises work nobody tracks, branches and drafts left behind, a dependency nothing imports.

Method: every claim below was checked against the repo or the GitHub API on canary `236dcab1` (v0.1.33), not read for sense. Items are sorted by who has to act. **Fixed here** needed no decision. **Decide** needs the owner's call, and each carries a recommendation.

## The short version

The code and the docs pages are in good shape. The mechanical pass in #844 found no dead path, script, env var or workflow reference, and this pass found one dead dependency and no orphan script or workflow. What has rotted is everything that tracks work: the plans index, the dated audits, the Icebox issue, the public roadmap's Planned table, and the branch list. They drift because nothing fails when they do.

## Fixed in this PR

- **`plans/bun-native-scripts.md` shipped and was never closed.** It asks to move `.github/scripts` off `node:fs`. PR #805 (merged 2026-08-23) did that: no script there imports `node:fs` today. File and index line removed, as #825 and #839 did for finished items.
- **`plans/hardening-refactors.md` said "in progress"; its three named items all shipped.** CI gates check-types and tests, `serverSecret()` exists in `packages/env/src/lib/polyfill.ts` and guards `BETTER_AUTH_SECRET`, and `AGENT_SIGNIN_ENABLED` gates the agent route. What is left is its own "larger, tracked separately" tail: default security headers and CSP, and a durable rate-limit store. Status and index line now say that, and it moves from In progress to the backlog.
- **`plans/rss-feed.md` had no status line**, the only plan without one. It is listed under Icebox, so it now says so.
- **The roadmap's "Configurable features" bullet named five of the six flags.** It omitted the allowlist, the same omission #830 fixed in `docs.config.ts`.

## Decide

### 1. The public roadmap promises work nobody tracks

`getting-started/roadmap.mdx` has a Planned table of fifteen third-party integrations: eight payment providers, two email, two background-job, two i18n, and the Vercel AI SDK. **None of them appears anywhere in `.github/notes/plans/`**, which is the real backlog: passkeys, deployment adapters, feature flags, preview URLs, a logo, a landing page. The plans index itself says to keep the two from drifting. Meanwhile "Shipped today" omits surfaces that have their own docs page: the allowlist, the data tables, realtime over WebSockets, and the console activity log.

Recommendation: replace the integrations table with what is actually planned, or cut the Planned section to a sentence. A starter that lists eight payment providers it has no plan to build reads as less finished than one that lists none. Add the four missing shipped surfaces either way.

### 2. The TanStack Start migration is "in progress" and has not moved since July

`plans/tanstack-start-migration.md` says the migration is complete and blocked only on a Vercel Bun-runtime deploy. Two facts have changed. The blocker is gone: since #801 both apps run on Vercel's Bun runtime (`bunVersion: 1.4.x` in both `vercel.json` files). And the work is stale: branch `web/cutover` last moved 2026-07-06 and is 183 commits behind canary, with its PRs #647 to #649 closed.

Recommendation: decide between reviving it as a fresh migration against today's canary, since a 183-commit rebase of a framework swap is a rewrite in practice, or parking it under Icebox with the reason. Either is fine; "in progress" is the one state it is not in.

### 3. The Icebox issue (#707) no longer mirrors the index it claims to mirror

The plans index says its Icebox section is mirrored as checkboxes on #707. It is not:

- The issue links **six plan files that do not exist**: `build-time-deploy-mode`, `handoff-cookie-lifetime`, `handoff-route-tests`, `split-oauth-callback-binding`, and, on still-open checkboxes, `rate-limit-client-ip` and `portless-local-urls` (the latter behind four open items).
- **"Remove the now-unused `HONO_APP_URL`" is wrong.** It is used: `packages/auth/src/index.ts` derives the API origin, the cookie scope and the Better Auth `baseURL` from it.
- **"Parallel worktree dev stacks (dynamic ports)" shipped** with portless (#715): branch-prefixed hosts are how every worktree runs today.
- "Unit tests for data-table pure helpers" cites `api/hono/test`, which no longer exists; tests moved to the root `tests/` mirror, and the layout math is covered there.
- The activity log reads "GRADUATED to in progress"; it shipped in #762.
- "Console not-found status" is an open Icebox checkbox on the issue and a backlog item in the index.

Recommendation: rewrite the issue body from the index, which is the maintained copy. Left undone here: it is an edit to a GitHub issue, not to a file this PR can carry, so it waits for a go-ahead.

### 4. Three dated audits outlived the rule that governs them

`AGENTS.md` says an audit is deleted once its findings are shipped or consciously declined.

- **`2026-07-04-cli-dx.md`** (untouched since 2026-07-12) marks two of ten findings shipped. Since then the CLI gained a README and fourteen test files, which look like findings 7 and 8, but nobody recorded it. Genuinely open: `--dry-run` exists on `init` only, not on `reinit` or `sync` (finding 2); `sync` has no `--yes` or confirmation (4); no update notice (5); no `--verbose` (9).
- **`2026-07-04-lighthouse-zerostarter-dev.md`** ends with its own exit condition: delete once P3, P4, P5 and the P1 extras are decided. They are four product tradeoffs (deferring PostHog off first load, scoping the fumadocs CSS, a long TTL for marketing assets, pausing the grain off-screen) and have waited since July.
- **`2026-09-06-deepsec.md`** looks fully dispositioned: fixes shipped, item 11 lives on as `plans/action-sha-pinning.md`, item 10 inside `workflow-tooling-consistency.md`, item 12 is an explicit accept.

Recommendation: delete the deepsec audit; move the four open CLI findings into one plan and delete that audit; decide the four Lighthouse items, even if the decision is "no", and delete it. This audit should go the same way once its Decide list is worked.

### 5. Thirty-eight remote branches, six of them live

Squash merges never mark a branch merged, so nothing prunes them. By the state of their pull requests: **25 belong to PRs closed without merging** (June to August), **6 never had a PR** (`testing`, `web/start`, `feat/data-table`, `feat/vercel-services-poc`, `preview/landing-gsap`, `spike/platform-data-table`), 1 is merged and left behind (`feat/portless-auth-isolation`), and 6 back open PRs.

Recommendation: delete the 26 that are merged or closed; a closed PR keeps its commits reachable through `refs/pull/<n>/head`, so nothing is lost. Look at the six with no PR before deleting, since those hold the only copy of whatever they were.

### 6. Five draft PRs, all conflicting

#700 and #718 date from mid-July and sit more than 200 commits behind; #746 is 81 behind; #799 and #810 are from August. All five now conflict with canary, so none of them runs the PR build any more, and their green checks are from before they fell behind.

Recommendation: #799 (split `unwrap` out of the API client) and #810 (agent readiness) are recent and self-contained enough to rebase. #700, #718 and #746 are older than most of the code they touch; close them and keep what still matters as a plan.

### 7. `vaul` is a dead dependency

Nothing imports it. `web/next/src/components/ui/drawer.tsx` is built on `@base-ui/react/drawer`; `vaul` was last imported before the Base UI move. It survives because `shadcn-customize.ts` restores `package.json` from HEAD on every sync, so a dependency the registry stopped needing is never dropped. It also pulls `@radix-ui/react-dialog` into a Base UI app. Five other candidates from the same scan are used implicitly and are fine: both commitlint packages (the hook and the config block), `babel-plugin-react-compiler` (`reactCompiler: true`), `react-dom`, and the `@packages/scripts` workspace link that carries it through `turbo prune`.

Recommendation: remove it, in its own `build(deps)` PR so the lockfile change is reviewable. Not done here to keep this PR to notes and docs.

### 8. Smaller, for the record

- `.github/scripts/deps-manager.ts` opens with `TODO: AI-generated script, replace later`, written 2025-11-29. It runs on every `postinstall` and is what enforces the catalog's caret rule, so it is load-bearing code with a ten-month-old note saying it should not be trusted. Either the note goes or the rewrite gets a plan.
- `skills-lock.json` records `agent-browser` only, while `portless` is vendored too and its skill says `source: portless`. Either the lock tracks one kind of vendoring and the doc-sync skill should say so, or portless is missing from it.
- `plans/web-content-source-tests.md` still frames the `contentSource` test as waiting for "a web test harness". One exists: five unit test files run under `tests/web/next/src/lib/`. The test itself is still unwritten, so the item stands, but its blocker may not.
- `plans/rate-limit-ip-resolution.md` is indexed as "adopt `@arcjet/ip`". `rate-limiter.ts` already imports `findIp` from it; what the plan wants is the adapter-style use with `platform` and `proxies`. The index line reads as if nothing is adopted.

## Checked and fine

- **Docs pages.** Oldest untouched: `resources/infisical.mdx` and `resources/ide-setup.mdx` (2026-07-02). Both still accurate; Infisical is optional, `.infisical.json` exists and is fork-excluded, so a fork does not inherit the author's workspace id.
- **Skills.** All eighteen custom skills map to a live procedure; the ones untouched longest (`ignore-sync`, `icebox`, `fonts`) describe things that have not changed.
- **Scripts.** Every file under `.github/scripts` and `packages/scripts/src` is wired to a package script, workflow, hook or Dockerfile.
- **Workflows.** Five, all with live triggers.
- **Code markers.** One `TODO` in the whole tree (above); no `FIXME`, `HACK` or `XXX`.
- **Agent docs overlap.** `working-with-agents.mdx` (the loop) and `ai-skills.mdx` (the catalog) cover different ground; `contributing.mdx` matches how work lands.
