# AGENTS.md

Guidance for AI coding agents in this repository: a Bun monorepo with the `web/next` app, the `api/hono` service, and shared `packages/*`. The canonical starter also carries the `packages/cli` npm binary, the `tests/` suite and `.github/notes/`, none of which a fork takes; this guide and every skill ship to a fork whole, rebranded to its name. Start each task with the `codebase-map` skill, then load the task skill that fits (see [Skills](#skills)).

## Workflow

- ALWAYS: Work in a git worktree under `.claude/worktrees/`, one directory per change, branched from freshly fetched `origin/canary` (`git fetch origin canary && git worktree add .claude/worktrees/<name> -b <branch> origin/canary`), so the change builds on current canary and the primary checkout stays clean.
- ALWAYS: Show the user a new or altered schema and wait for their go before generating or applying a migration, naming the choices that are costly to reverse (`db-migration`).
- NEVER: Point local database work at the `POSTGRES_URL` in the root `.env`: `canary` and production both read that Neon database, so a migration applied there is applied to production under running code. Local work runs against a disposable container (`bunx pglaunch -k`) named in the worktree's own `.env`, seeded with fake rows (`db-migration`).
- ALWAYS: Land the docs and the skills a change touches in the same change, and remove a skill the change makes obsolete (`doc-sync`).

## Code

- ALWAYS: Import through `@/` where the alias applies.
- ALWAYS: Put a test under the repo-root `tests/`, mirroring the path of the file it covers; a package carries no `test/` of its own (canonical starter only; `codebase-map` holds the layout).
- ALWAYS: Put a new build or tooling script in `packages/scripts/src/`, with its dependencies declared there, so `turbo prune` carries it into the Docker build.
- ALWAYS: Use a Bun-native API where the file runs under Bun and one exists; otherwise a Node built-in with the `node:` prefix (`runtime-apis` names the areas that run under Node).
- ALWAYS: Keep enumerable lists A→Z (enum members, env-var schemas and their mirrors, the docs that list them), with a meaningful order only where alphabetical would obscure intent; an API response leads with its subject, then A→Z (`api-endpoint`).
- ALWAYS: Version every root `catalog` entry with a caret range; `postinstall` rewrites exact and tilde pins back, so a deliberate pin means changing that rule and recording why (`audit`).
- Comment only where the code cannot say it, on one line.
- NEVER: Use an em-dash (U+2014) in code, comments, docs, or copy; a comma, colon, or period carries the pause, and a hyphen is fine.
- NEVER: Use an `unstable_` framework API; every fork inherits the choice, so stable APIs only.

## UI

- ALWAYS: Follow the `design` skill for UI, styling, and design decisions, and update it in the same change when a convention changes.
- NEVER: Hand-edit `web/next/src/components/ui/`; it is generated, and a customization goes through the post-sync script (`shadcn-sync`) or a wrapper component.
- ALWAYS: Verify a frontend change in a real browser before opening or updating a PR, signed in as the agent, with before and after screenshots attached to the PR (`ui-verify`).

## Commits

- ALWAYS: Make atomic commits in the Conventional Commits format (`gh-commit`).
- NEVER: Add a `Co-authored-by` trailer; the author line alone names who committed.

## Working notes

Canonical starter only: audits and plans live under `.github/notes/`, laid out by `.github/notes/plans/README.md`.

## Skills

Skills live in `.agents/skills` (symlinked to `.claude/skills` and `.github/skills`, so every agent tool reads the same files). Each is a `SKILL.md` whose `description` is the trigger and whose body is the procedure; only the description is scanned until a skill matches. **Custom** skills are maintained in this repo; **vendored** skills are copied verbatim from an upstream project (re-vendor to update, do not hand-edit). Write or change a custom skill, or this guide, with `writing-for-agents` loaded; write or change a docs page with `writing-docs` loaded.

**Custom**

<!-- skills:custom -->

| Skill                                                    | Description                                                                                                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [add-package](.agents/skills/add-package/SKILL.md)       | Add a new shared workspace package under packages/*.                                                                                                              |
| [api-endpoint](.agents/skills/api-endpoint/SKILL.md)     | Add a typed Hono API endpoint or WebSocket route: router, OpenAPI docs, validation envelope, and RPC client wiring.                                               |
| [audit](.agents/skills/audit/SKILL.md)                   | Refresh every dependency and version pin to its latest release, run the dependency security audit, and maintain .github/notes/dependencies.md.                    |
| [codebase-map](.agents/skills/codebase-map/SKILL.md)     | Orient in this repo: which file to edit for a change, how a change ripples across the stack, and how to search the code.                                          |
| [db-migration](.agents/skills/db-migration/SKILL.md)     | Create and apply a Drizzle schema change.                                                                                                                         |
| [design](.agents/skills/design/SKILL.md)                 | Follow and maintain the app's UI conventions.                                                                                                                     |
| [dev](.agents/skills/dev/SKILL.md)                       | Start, restart, and verify the dev stack, and sign in as the agent.                                                                                               |
| [doc-sync](.agents/skills/doc-sync/SKILL.md)             | Sync docs and skills so they never drift from the code.                                                                                                           |
| [docker-test](.agents/skills/docker-test/SKILL.md)       | Build and smoke-test the Docker images with docker compose, and run the golden end-to-end suite against them.                                                     |
| [fonts](.agents/skills/fonts/SKILL.md)                   | Add, swap, or remove a self-hosted web font (latin variable woff2 from fontsource, localized via next/font/local).                                                |
| [gh-commit](.agents/skills/gh-commit/SKILL.md)           | Create atomic commits in the conventional format.                                                                                                                 |
| [icebox](.agents/skills/icebox/SKILL.md)                 | Icebox a raised-but-undecided concern instead of forcing a plan-or-dismiss call: record it with no verdict so the context survives.                               |
| [ignore-sync](.agents/skills/ignore-sync/SKILL.md)       | Mirror .gitignore to .dockerignore.                                                                                                                               |
| [release](.agents/skills/release/SKILL.md)               | Cut a production release by promoting canary to main.                                                                                                             |
| [runtime-apis](.agents/skills/runtime-apis/SKILL.md)     | Prefer Bun-native APIs, else Node built-ins with the node: prefix.                                                                                                |
| [shadcn-sync](.agents/skills/shadcn-sync/SKILL.md)       | Run and reconcile the shadcn component sync (`bun run shadcn:update`).                                                                                            |
| [skills-manager](.agents/skills/skills-manager/SKILL.md) | Keep the AGENTS.md skills tables generated from skill descriptions, and understand how a fork syncs its skills from upstream.                                     |
| [ui-verify](.agents/skills/ui-verify/SKILL.md)           | Verify a frontend or UI change in a real browser.                                                                                                                 |
| [writing-docs](.agents/skills/writing-docs/SKILL.md)     | Write or rewrite a docs page under web/next/content/docs so it orients the reader, explains the why, and points at the code and skills instead of restating them. |

<!-- /skills:custom -->

**Vendored** (upstream, copied verbatim)

<!-- skills:vendored -->

| Skill                                                            | Description                                                                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [agent-browser](.agents/skills/agent-browser/SKILL.md)           | Browser automation CLI for AI agents.                                                                                    |
| [portless](.agents/skills/portless/SKILL.md)                     | Set up and use portless for named local dev server URLs (e.g. https://myapp.localhost instead of http://localhost:3000). |
| [writing-for-agents](.agents/skills/writing-for-agents/SKILL.md) | Writing documents for agents.                                                                                            |

<!-- /skills:vendored -->
