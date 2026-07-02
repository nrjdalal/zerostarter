# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Instructions

- ALWAYS: Use `@/` for imports, if applicable.
- ALWAYS: Follow the `design` skill for UI, styling, and design decisions (it holds the canonical conventions). Update it in the same change when a convention changes.
- ALWAYS: For any frontend or UI change, verify it in a real browser with agent-browser before opening or updating a PR; drive the actual page or flow, do not rely on type-check and lint alone. Run the end-to-end flow when the change spans it or when asked. Capture screenshots, upload them to litterbox (72h), and attach the URLs to the PR. See the `ui-verify` skill.
- ALWAYS: Keep documentation in sync with every change. Whenever code, structure, conventions, or tooling change, update the matching docs in the same change (e.g. `web/next/content/docs/`, `README.md`, the `llms.txt`/`llms-full.txt` context routes, skill docs under `.agents/skills/` and `.claude/skills/`, and these agent guides `AGENTS.md`/`CLAUDE.md`). Docs must never drift.
- ALWAYS: When code, a convention, a command, a path, or tooling changes, review the skills in `.agents/skills/` that touch it and update them in the same change, so every skill stays accurate and relevant. A skill that describes old behavior misleads every agent that loads it, which is worse than no skill. If a change makes a skill obsolete, remove it; if it reveals a gap, consider adding one.
- NEVER: Include "Co-authored-by" in commit messages.
- NEVER: Use em-dashes (the long dash, U+2014) in code, comments, docs, or copy. Regular hyphens are fine; for a pause or aside, use a comma, colon, or period.
- Do not comment unnecessarily. Only comment if it is absolutely necessary.
- Keep comments on a single line; do not split one across multiple `//` lines or use multi-line `/* */` blocks.
- Write audit reports (any kind) to `.github/audit/` as dated files (`YYYY-MM-DD-<topic>.md`). Audits are transient working docs: delete one once its findings are fully addressed (shipped or consciously won't-fixed) so the directory does not accumulate stale records.

## Logging in (agents)

Signs in as `LocalAgent` (`agent@local.host`). Click **Login (agents)** in the dev UI, or use curl:

```bash
curl -sS -c cookies.txt -X POST -H "Origin: http://localhost:3000" http://localhost:4000/api/agents/sign-in-as
curl -sS -b cookies.txt http://localhost:4000/api/v1/user
```

Local-only and requires a trusted `Origin` header. See `api/hono/src/routers/agents.ts` if needed.

## Skills

Custom skills live in `.agents/skills` (symlinked to `.claude/skills` and `.github/skills`, so every agent tool reads the same files). Each is a `SKILL.md` with a `description` trigger and a literal procedure; only the description is scanned until a skill matches. Start with `codebase-map` to orient, then load the task skill that fits.

| Skill                        | Use it to                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `agent-browser`              | Drive the running app in a browser: navigate, click, type, screenshot.                             |
| `api-endpoint`               | Add a typed Hono API endpoint: router, validation envelope, OpenAPI, RPC wiring.                   |
| `audit`                      | Run the dependency security audit and maintain `AUDIT.md`.                                         |
| `codebase-map`               | Orient: where to edit for a change, trace a feature across the stack, search the repo. Start here. |
| `db-migration`               | Create and apply a Drizzle schema change.                                                          |
| `design`                     | Follow the app's UI conventions: spacing, color, tokens, primitives.                               |
| `dev`                        | Start, restart, and verify the dev stack, and fix the `bun --hot` stale-route trap.                |
| `docker-test`                | Build and smoke-test the Docker images.                                                            |
| `fonts`                      | Add or swap a self-hosted web font.                                                                |
| `gh-commit`                  | Make atomic, conventional commits.                                                                 |
| `github-pull-request-review` | Run a turn-based PR review.                                                                        |
| `ignore-sync`                | Keep `.dockerignore` in step with `.gitignore`.                                                    |
| `shadcn-sync`                | Run and reconcile the shadcn component sync.                                                       |
| `ui-verify`                  | Verify a frontend or UI change in a real browser and attach screenshots to the PR.                 |
