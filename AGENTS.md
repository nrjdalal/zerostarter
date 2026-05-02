# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Instructions

- Do not comment unnecessarily. Only comment if it is absolutely necessary.
- Use `@/` for imports, if applicable.

## Logging in (agents)

Signs in as `AgentZero` (`agent@zerostarter.dev`). Dev UI: **Login (agents)** button. Headless via curl:

```bash
curl -sS -c cookies.txt -X POST -H "Origin: http://localhost:3000" http://localhost:4000/api/agents/sign-in-as
curl -sS -b cookies.txt http://localhost:4000/api/v1/user
```

`api/hono/src/routers/agents.ts` mints the session directly via better-auth's internal adapter. Gated to local NODE_ENV; the `Origin` header is used only to derive the redirect target.

## Skills

This project includes custom skills to assist with common tasks. Skills are located in `.agents/skills` and `.claude/skills`.
