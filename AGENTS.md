# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Instructions

- ALWAYS: Use `@/` for imports, if applicable.
- NEVER: Include "Co-authored-by" in commit messages.
- Do not comment unnecessarily. Only comment if it is absolutely necessary.
- Keep comments on a single line; do not split one across multiple `//` lines or use multi-line `/* */` blocks.

## Logging in (agents)

Signs in as `AgentZero` (`agent@zerostarter.dev`). Click **Login (agents)** in the dev UI, or use curl:

```bash
curl -sS -c cookies.txt -X POST -H "Origin: http://localhost:3000" http://localhost:4000/api/agents/sign-in-as
curl -sS -b cookies.txt http://localhost:4000/api/v1/user
```

Local-only and requires a trusted `Origin` header. See `api/hono/src/routers/agents.ts` if needed.

## Skills

This project includes custom skills to assist with common tasks. Skills are located in `.agents/skills` and `.claude/skills`.
