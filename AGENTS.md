# AGENTS.md

Guidance for AI coding agents working in this repository, a Bun monorepo: the `packages/cli` npm binary, the `web/next` app, the `api/hono` service, and shared `packages/*` (auth, config, db, env). Start each task with the `codebase-map` skill to orient, then load the task skill that fits (see [Skills](#skills)).

## Workflow

- ALWAYS: Do every change in its own git worktree, never on the primary checked-out branch. Create it under `.claude/worktrees/` (repo-root relative, one directory per worktree; never `/tmp`, home, or a sibling of the repo), and merge the latest `canary` into the working branch before starting so the change builds on current main.
- ALWAYS: Keep documentation in sync with every change. Whenever code, structure, conventions, or tooling change, update the matching docs in the same change (e.g. `web/next/content/docs/`, `README.md`, the `llms.txt`/`llms-full.txt` context routes, skill docs under `.agents/skills/` and `.claude/skills/`, and these agent guides `AGENTS.md`/`CLAUDE.md`). Docs must never drift. See the `doc-sync` skill.
- ALWAYS: When code, a convention, a command, a path, or tooling changes, review the skills in `.agents/skills/` that touch it and update them in the same change, so every skill stays accurate and relevant. A skill that describes old behavior misleads every agent that loads it, which is worse than no skill. If a change makes a skill obsolete, remove it; if it reveals a gap, consider adding one.

## Code

- ALWAYS: Use `@/` for imports, if applicable.
- ALWAYS: Prefer a Bun-native API when the file runs under Bun and one exists (`Bun.file`, `Bun.write`, `Bun.spawn`); otherwise use a Node built-in with the `node:` protocol prefix (`import { join } from "node:path"`, `require("node:fs")`), never the bare specifier. Node-runtime code (the `packages/cli` npm binary, `web/next`, and shared `packages/env`) stays on `node:`. See the `runtime-apis` skill.
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
WEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)   # or PORTLESS=0 for fixed :3000/:4000
curl -sS -c cookies.txt -X POST -H "Origin: $WEB" "$API/api/agents/sign-in-as"
curl -sS -b cookies.txt "$API/api/v1/user"
```

Local-only (needs `NODE_ENV=local` and `AGENT_SIGNIN_ENABLED=true`) and requires a trusted `Origin` header. See `api/hono/src/routers/agents.ts` if needed.

## Skills

Skills live in `.agents/skills` (symlinked to `.claude/skills` and `.github/skills`, so every agent tool reads the same files). Each is a `SKILL.md` with a `description` trigger and a literal procedure; only the description is scanned until a skill matches. Start with `codebase-map` to orient, then load the task skill that fits. **Custom** skills are maintained in this repo; **vendored** skills are copied verbatim from an upstream project (re-vendor to update, do not hand-edit).

**Custom**

| Skill          | Description                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `api-endpoint` | Add a typed Hono API endpoint or WebSocket route: router, OpenAPI docs, validation envelope, and RPC client wiring.      |
| `audit`        | Run the dependency security audit and maintain `.github/notes/dependencies.md`.                                          |
| `codebase-map` | Orient in this repo: which file to edit for a change, how a change ripples across the stack, and how to search the code. |
| `db-migration` | Create and apply a Drizzle schema change.                                                                                |
| `design`       | Follow and maintain the app's UI conventions.                                                                            |
| `dev`          | Start, restart, and verify the dev stack; `bun run dev` serves portless named `.localhost` URLs.                         |
| `doc-sync`     | Sync docs and skills so they never drift from the code.                                                                  |
| `docker-test`  | Build and smoke-test the Docker images with docker compose.                                                              |
| `fonts`        | Add, swap, or remove a self-hosted web font (latin variable woff2 from fontsource, localized via next/font/local).       |
| `gh-commit`    | Create atomic commits in the conventional format.                                                                        |
| `ignore-sync`  | Mirror `.gitignore` to `.dockerignore`.                                                                                  |
| `runtime-apis` | Prefer Bun-native APIs, else Node built-ins with the `node:` prefix.                                                     |
| `shadcn-sync`  | Run and reconcile the shadcn component sync (`bun run shadcn:update`).                                                   |
| `ui-verify`    | Verify a frontend or UI change in a real browser.                                                                        |

**Vendored** (upstream, copied verbatim)

| Skill           | Description                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `agent-browser` | Browser automation CLI for AI agents.                                                                                        |
| `portless`      | Set up and use portless for named local dev server URLs (e.g. `https://myapp.localhost` instead of `http://localhost:3000`). |
