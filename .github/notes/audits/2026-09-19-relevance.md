# Relevance audit (2026-09-19)

The two sweeps before this one (#830, #844) asked whether what the docs say is true. This one asks a different question: is each thing still relevant? Plans that shipped or died, audits never closed, a public roadmap that promises work nobody tracks, branches and drafts left behind, a dependency nothing imports. Delete this file once the Decide list below is worked.

Method: every claim below was checked against the repo or the GitHub API on canary `236dcab1` (v0.1.33), not read for sense. Items are sorted by who has to act. **Fixed here** needed no decision or was done on the owner's go-ahead. **Decide** needs the owner's call, and each carries a recommendation. Decide items keep the numbers they were first reported under, so the gaps are the ones since done.

## The short version

The code and the docs pages are in good shape. The mechanical pass in #844 found no dead path, script, env var or workflow reference, and this pass found one dead dependency and no orphan script or workflow. What has rotted is everything that tracks work: the plans index, the dated audits, the Icebox issue, the public roadmap's Planned table, and the branch list. They drift because nothing fails when they do. Most of that is now cleared; what is left under Decide is the part only the owner can rule on.

## Fixed in the tree

The first six landed with this report in #845; the last four are item 8, done after it.

- **`plans/bun-native-scripts.md` shipped and was never closed.** It asks to move `.github/scripts` off `node:fs`. PR #805 (merged 2026-08-23) did that: no script there imports `node:fs` today. File and index line removed, as #825 and #839 did for finished items.
- **`plans/hardening-refactors.md` said "in progress"; its three named items all shipped.** CI gates check-types and tests, `serverSecret()` exists in `packages/env/src/lib/polyfill.ts` and guards `BETTER_AUTH_SECRET`, and `AGENT_SIGNIN_ENABLED` gates the agent route. What is left is its own "larger, tracked separately" tail: default security headers and CSP, and a durable rate-limit store. Status and index line now say that, and it moves from In progress to the backlog.
- **`plans/rss-feed.md` had no status line**, the only plan without one. It is listed under Icebox, so it now says so.
- **The roadmap's "Configurable features" bullet named five of the six flags.** It omitted the allowlist, the same omission #830 fixed in `docs.config.ts`.
- **Three dated audits had outlived the rule that governs them** (first reported as item 4). `AGENTS.md` says an audit is deleted once its findings are shipped or consciously declined. All three are gone, each by the route its contents called for:
  - `2026-09-06-deepsec.md` was fully dispositioned: nine fixes shipped, item 10 lives in `plans/workflow-tooling-consistency.md`, items 3, 11 and 13 are on ice, item 12 is an explicit accept. Deleted. Its re-run recipe leaves the tree with it; `git show 236dcab1:.github/notes/audits/2026-09-06-deepsec.md` brings it back.
  - `2026-07-04-cli-dx.md` marked two of ten findings shipped. Checked against today's CLI, a third is closed (npm packs the README whatever `files` says) and a fourth partly (`init` and the prompt layer have tests; `reinit` and `sync` do not). The rest have a known next action, so they moved to the backlog as `plans/cli-dx.md`: `--dry-run` on `reinit` and `sync`, a `--ref` with a provenance stamp, a confirm on `sync`, an update notice, `--verbose`, and one constant for the gitpick pin. The first report of this audit listed four open findings and missed the `--ref` and the pin; the plan has all of them.
  - `2026-07-04-lighthouse-zerostarter-dev.md` ended on four product tradeoffs with no verdict, which is what the Icebox is for. All four still describe the code, so they are parked as `plans/lighthouse-followups.md` with no recommendation.
- **An Icebox entry had lost its write-up.** "Authenticated WebSocket ticket pattern" pointed at `plans/portless-local-urls.md`, removed in July. The concern is still open (the one shipped socket is public, and the `api-endpoint` skill covers authenticated ones in a sentence), so it has a file again: `plans/websocket-auth-ticket.md`.

- **The "AI-generated script, replace later" note on `deps-manager.ts` is gone** (item 8). The script has been extended by hand since 2025-11 and reads soundly, so it does not need replacing. What it lacks is a test, which is now a backlog plan that names the two small changes in the way: `plans/deps-manager-tests.md`.
- **`skills-lock.json` was right and one skill line was wrong** (item 8). The lock pins `agent-browser` because it is a stub kept for integrity; `portless` is copied in full and needs no pin, which `resources/ai-skills.mdx` already says. The `doc-sync` skill claimed every vendored skill touches the lock; it now draws the same line.
- **`plans/web-content-source-tests.md` named the wrong blocker** (item 8). It waited on a web test harness, and one runs five files under `tests/web/next/src/lib/`. What the `contentSource` test needs is module mocks for the generated fumadocs source and `next/navigation`, which no test in the suite uses yet. The plan and its index line say so.
- **The rate-limit index line read as if `@arcjet/ip` were not adopted** (item 8). It is the resolver already, called bare; the line now says the ask is to call it as its adapters do. Mirrored on #707.

## Done outside the tree

- **Icebox issue #707 rewritten from the plans index** (first reported as item 3). It linked six plan files that did not exist and carried seven open boxes the index did not. Each was checked before it was ticked, and the issue now records what happened to it:
  - Shipped: parallel worktree dev stacks (portless, #715), the fork rebrand of the portless names (`rebrandPortless`, #777), sign-in on `*.vercel.app` hosts (#727).
  - Dissolved: the four split-deploy follow-ups (build-time mode, handoff route tests, handoff cookie lifetime, the OAuth callback binding). #727 replaced the nonce handoff with a same-origin proxy, so there is no handoff route, no `SameSite=None` and no `skipStateCookieCheck` left to harden.
  - A false claim: "remove the now-unused `HONO_APP_URL`". `packages/auth/src/index.ts` derives the API origin, the cookie scope and the Better Auth `baseURL` from it.
  - Merged into other entries: the same-origin-proxy client IP concern, now covered by the two rate-limit entries.
  - Moved to the backlog: console not-found status, and the data-table helper tests (`plans/web-content-source-tests.md`). The activity log shipped in #762.
- **Twenty-two stale remote branches deleted** (item 5), 41 down to 19. Each belonged to a closed PR, and each tip was confirmed equal to its PR's head first, so every commit is still reachable at `refs/pull/<n>/head`. Four closed-PR branches were held back on purpose: `feat/passkey`, which its plan says to resume from, and the migration stack `web/cutover`, `web/start-migrated` and `test/golden-suite`, which belong to decision 2 below. Six branches that never had a PR are untouched, since they hold the only copy of whatever they were: `feat/data-table`, `feat/vercel-services-poc`, `preview/landing-gsap`, `spike/platform-data-table`, `testing`, `web/start`.
- **`vaul` removed in #846** (item 7). Nothing imported it; the drawer is built on `@base-ui/react/drawer`, and it survived because the shadcn sync resets `package.json` to HEAD. One correction to the first report: removing it does not take `@radix-ui/react-dialog` out of the app, since `cmdk` and `fumadocs-ui` depend on it too.

## Decide

### 1. The public roadmap promises work nobody tracks

`getting-started/roadmap.mdx` has a Planned table of fifteen third-party integrations: eight payment providers, two email, two background-job, two i18n, and the Vercel AI SDK. **None of them appears anywhere in `.github/notes/plans/`**, which is the real backlog: passkeys, deployment adapters, feature flags, preview URLs, a logo, a landing page. The plans index itself says to keep the two from drifting. Meanwhile "Shipped today" omits surfaces that have their own docs page: the allowlist, the data tables, realtime over WebSockets, and the console activity log.

Recommendation: replace the integrations table with what is actually planned, or cut the Planned section to a sentence. A starter that lists eight payment providers it has no plan to build reads as less finished than one that lists none. Add the four missing shipped surfaces either way.

### 2. The TanStack Start migration is "in progress" and has not moved since July

`plans/tanstack-start-migration.md` says the migration is complete and blocked only on a Vercel Bun-runtime deploy. Two facts have changed. The blocker is gone: since #801 both apps run on Vercel's Bun runtime (`bunVersion: 1.4.x` in both `vercel.json` files). And the work is stale: branch `web/cutover` last moved 2026-07-06 and is 183 commits behind canary, with its PRs #647 to #649 closed.

Recommendation: decide between reviving it as a fresh migration against today's canary, since a 183-commit rebase of a framework swap is a rewrite in practice, or parking it under Icebox with the reason. Either is fine; "in progress" is the one state it is not in.

### 6. Five draft PRs, all conflicting

#700 and #718 date from mid-July and sit more than 200 commits behind; #746 is 81 behind; #799 and #810 are from August. All five now conflict with canary, so none of them runs the PR build any more, and their green checks are from before they fell behind.

Recommendation: #799 (split `unwrap` out of the API client) and #810 (agent readiness) are recent and self-contained enough to rebase. #700, #718 and #746 are older than most of the code they touch; close them and keep what still matters as a plan.

## Checked and fine

- **Docs pages.** Oldest untouched: `resources/infisical.mdx` and `resources/ide-setup.mdx` (2026-07-02). Both still accurate; Infisical is optional, `.infisical.json` exists and is fork-excluded, so a fork does not inherit the author's workspace id.
- **Skills.** All eighteen custom skills map to a live procedure; the ones untouched longest (`ignore-sync`, `icebox`, `fonts`) describe things that have not changed.
- **Scripts.** Every file under `.github/scripts` and `packages/scripts/src` is wired to a package script, workflow, hook or Dockerfile.
- **Workflows.** Five, all with live triggers.
- **Code markers.** One `TODO` in the whole tree (above); no `FIXME`, `HACK` or `XXX`.
- **Agent docs overlap.** `working-with-agents.mdx` (the loop) and `ai-skills.mdx` (the catalog) cover different ground; `contributing.mdx` matches how work lands.
