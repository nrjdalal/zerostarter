# AGENTS.md

Guidance for AI coding agents working in this repository, a Bun monorepo: the `packages/cli` npm binary, the `web/next` app, the `api/hono` service, and shared `packages/*` (auth, config, db, env), with build-only tooling in `packages/scripts`. Start each task with the `codebase-map` skill to orient, then load the task skill that fits (see [Skills](#skills)).

## Workflow

- ALWAYS: Do every change in its own git worktree, never on the primary checked-out branch. Create it under `.claude/worktrees/` (repo-root relative, one directory per worktree; never `/tmp`, home, or a sibling of the repo), and fork its branch from the latest `canary`: fetch first, then branch from `origin/canary` (`git fetch origin canary && git worktree add .claude/worktrees/<name> -b <branch> origin/canary`), so the change builds on current main.
- ALWAYS: Show the user a new or altered database schema and wait for their go before generating or applying a migration. Name the choices that are costly to reverse and stop; a shape is cheap to argue about and expensive to change once rows exist, and `canary` shares its database with production, so applying reaches production immediately. See the `db-migration` skill.
- ALWAYS: Point local database work at a disposable container (`bunx pglaunch -k`) set in the worktree's own `.env`, never the `POSTGRES_URL` that ships in the root `.env`. That one is the shared Neon database read by both `canary` and production, so a migration or a rename applied there reaches production immediately and under running code. Seed fake rows; real rows must never reach a screenshot or a PR. See the `db-migration` skill.
- ALWAYS: Keep documentation in sync with every change. Whenever code, structure, conventions, or tooling change, update the matching docs in the same change (e.g. `web/next/content/docs/`, `README.md`, the `llms.txt`/`llms-full.txt` context routes, skill docs under `.agents/skills/` and `.claude/skills/`, and these agent guides `AGENTS.md`/`CLAUDE.md`). Docs must never drift. See the `doc-sync` skill.
- ALWAYS: When code, a convention, a command, a path, or tooling changes, review the skills in `.agents/skills/` that touch it and update them in the same change, so every skill stays accurate and relevant. A skill that describes old behavior misleads every agent that loads it, which is worse than no skill. If a change makes a skill obsolete, remove it; if it reveals a gap, consider adding one.

## Code

- ALWAYS: Use `@/` for imports, if applicable.
- ALWAYS: Put every test under the repo-root `tests/` directory, mirroring the path of the file it covers (`api/hono/src/lib/sql.ts` is tested by `tests/api/hono/src/lib/sql.test.ts`). One `bun run test` runs the suite; a package never carries its own `test/` directory or `test` script. That script builds `packages/*` first, because a test reaches a shared package through its `exports`, which point at `dist`, so on a fresh checkout an unbuilt package resolves to nothing. Only the shared packages are built, not the apps: a test imports app code by source path and never through `dist`. `tests/` is fork-excluded, so the root script no-ops where the directory is absent. Note `bun test` skips dot-directories, which is why `.github/scripts` tests live under `tests/github/scripts/`.
- ALWAYS: Put a new build or tooling script in `packages/scripts/src/`, not `.github/scripts/`, and declare the dependencies it imports on that package. It is a real workspace package, so `turbo prune` carries it into the Docker build without an extra COPY.
- ALWAYS: Prefer a Bun-native API when the file runs under Bun and one exists (`Bun.file`, `Bun.write`, `Bun.spawn`); otherwise use a Node built-in with the `node:` protocol prefix (`import { join } from "node:path"`, `require("node:fs")`), never the bare specifier. Code that runs under Node in any environment (the `packages/cli` npm binary, `web/next`, where `next dev` runs under Node while Docker and Vercel serve it under Bun, and shared `packages/env`) stays on `node:`. See the `runtime-apis` skill.
- ALWAYS: Keep enumerable lists alphabetical (A→Z), union/enum members, env-var schemas and their `runtimeEnv`/`turbo.json` mirrors, and the docs that list them, so the code and its docs stay in the same order. Use a meaningful order (flow, priority, required-then-optional) only where alphabetical would obscure intent. API response schemas are included, and they order by relevance first, then A→Z: where one key is what the response is about and the rest describe it, that key leads and the others sort after it (`users`, then `hasNextPage`, `page`, `perPage`, `total`). Everything else, a row's own fields included, is plain A→Z with `id` in its alphabetical place rather than hoisted. Sorting the subject too would put it in a different position on every endpoint, which is the drift this rule exists to prevent.
- ALWAYS: Version every root `catalog` entry with a caret range (`^1.2.3`), never an exact pin or a tilde. `.github/scripts/deps-manager.ts` rewrites exact and tilde specs on `postinstall`, including specs it promotes into the catalog from a workspace dep, and reports the rest (wildcards, dist-tags, compound ranges) for a manual fix. There is no opt-out: no pin survives an install, so pinning deliberately means changing the rule in that script and recording why in `.github/notes/dependencies.md`.
- Do not comment unnecessarily. Only comment if it is absolutely necessary.
- Keep comments on a single line; do not split one across multiple `//` lines or use multi-line `/* */` blocks.
- NEVER: Use em-dashes (the long dash, U+2014) in code, comments, docs, or copy. Regular hyphens are fine; for a pause or aside, use a comma, colon, or period.

## UI

- ALWAYS: Follow the `design` skill for UI, styling, and design decisions (it holds the canonical conventions). Update it in the same change when a convention changes.
- ALWAYS: For any frontend or UI change, verify it in a real browser with agent-browser before opening or updating a PR; drive the actual page or flow, do not rely on type-check and lint alone. Run the end-to-end flow when the change spans it or when asked. Capture screenshots, upload them to litterbox (72h), and attach the URLs to the PR. See the `ui-verify` skill.

## Commits

- Make atomic commits in the Conventional Commits format. See the `gh-commit` skill.
- NEVER: Include "Co-authored-by" in commit messages.

## Working notes

- Write audit reports (any kind) to `.github/notes/audits/` as dated files (`YYYY-MM-DD-<topic>.md`). Audits are transient working docs: delete one once its findings are fully addressed (shipped or consciously won't-fixed) so the directory does not accumulate stale records.
- Track planned, in-progress, and parked work in `.github/notes/plans/` (an index plus one file per item), not in dated audit files or scattered across issues; issues are the inbox, folded in and closed once captured.

## Logging in (agents)

Signs in as `LocalAgent` (`agent@local.host`). The route is gated: set `AGENT_SIGNIN_ENABLED=true` in `.env` first (it is off by default, so the route 404s without it and a deployed default env never exposes it). Then click **Login (agents)** in the dev UI, or use curl:

```bash
WEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)
curl -sS -c cookies.txt -X POST -H "Origin: $WEB" "$API/api/agents/sign-in-as"
curl -sS -b cookies.txt "$API/api/v1/user"
```

Local-only (needs `NODE_ENV=local` and `AGENT_SIGNIN_ENABLED=true`) and requires a trusted `Origin` header. See `api/hono/src/routers/agents.ts` if needed.

## Skills

Skills live in `.agents/skills` (symlinked to `.claude/skills` and `.github/skills`, so every agent tool reads the same files). Each is a `SKILL.md` with a `description` trigger and a literal procedure; only the description is scanned until a skill matches. Start with `codebase-map` to orient, then load the task skill that fits. **Custom** skills are maintained in this repo; **vendored** skills are copied verbatim from an upstream project (re-vendor to update, do not hand-edit).

**Custom**

<!-- skills:custom -->

| Skill                                                    | Description                                                                                                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [add-package](.agents/skills/add-package/SKILL.md)       | Add a new shared workspace package under packages/*.                                                                                                                                |
| [api-endpoint](.agents/skills/api-endpoint/SKILL.md)     | Add a typed Hono API endpoint or WebSocket route: router, OpenAPI docs, validation envelope, and RPC client wiring.                                                                 |
| [audit](.agents/skills/audit/SKILL.md)                   | Run the dependency security audit and maintain .github/notes/dependencies.md.                                                                                                       |
| [codebase-map](.agents/skills/codebase-map/SKILL.md)     | Orient in this repo: which file to edit for a change, how a change ripples across the stack, and how to search the code.                                                            |
| [db-migration](.agents/skills/db-migration/SKILL.md)     | Create and apply a Drizzle schema change.                                                                                                                                           |
| [design](.agents/skills/design/SKILL.md)                 | Follow and maintain the app's UI conventions.                                                                                                                                       |
| [dev](.agents/skills/dev/SKILL.md)                       | Start, restart, and verify the ZeroStarter dev stack. `bun run dev` serves portless named `.localhost` URLs (branch-prefixed in a worktree); resolve them with `bunx portless get`. |
| [doc-sync](.agents/skills/doc-sync/SKILL.md)             | Sync docs and skills so they never drift from the code.                                                                                                                             |
| [docker-test](.agents/skills/docker-test/SKILL.md)       | Build and smoke-test the Docker images with docker compose.                                                                                                                         |
| [fonts](.agents/skills/fonts/SKILL.md)                   | Add, swap, or remove a self-hosted web font (latin variable woff2 from fontsource, localized via next/font/local).                                                                  |
| [gh-commit](.agents/skills/gh-commit/SKILL.md)           | Create atomic commits in the conventional format.                                                                                                                                   |
| [icebox](.agents/skills/icebox/SKILL.md)                 | Icebox a raised-but-undecided concern instead of forcing a plan-or-dismiss call: record it with no verdict so the context survives.                                                 |
| [ignore-sync](.agents/skills/ignore-sync/SKILL.md)       | Mirror .gitignore to .dockerignore.                                                                                                                                                 |
| [release](.agents/skills/release/SKILL.md)               | Cut a production release by promoting canary to main.                                                                                                                               |
| [runtime-apis](.agents/skills/runtime-apis/SKILL.md)     | Prefer Bun-native APIs, else Node built-ins with the node: prefix.                                                                                                                  |
| [shadcn-sync](.agents/skills/shadcn-sync/SKILL.md)       | Run and reconcile the shadcn component sync (`bun run shadcn:update`).                                                                                                              |
| [skills-manager](.agents/skills/skills-manager/SKILL.md) | Keep the AGENTS.md skills tables generated from skill descriptions, and understand how a fork syncs its skills from upstream.                                                       |
| [ui-verify](.agents/skills/ui-verify/SKILL.md)           | Verify a frontend or UI change in a real browser.                                                                                                                                   |

<!-- /skills:custom -->

**Vendored** (upstream, copied verbatim)

<!-- skills:vendored -->

| Skill                                                  | Description                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [agent-browser](.agents/skills/agent-browser/SKILL.md) | Browser automation CLI for AI agents.                                                                                    |
| [portless](.agents/skills/portless/SKILL.md)           | Set up and use portless for named local dev server URLs (e.g. https://myapp.localhost instead of http://localhost:3000). |

<!-- /skills:vendored -->
