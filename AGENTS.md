# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Instructions

- Do not comment unnecessarily. Only comment if it is absolutely necessary.
- Use `@/` for imports, if applicable.

## Logging in (agents)

The auth dialog has a one-click **Login (agents)** button (visible only under `next dev`). It signs you in as `AgentZero` (`agent@zerostarter.dev`).

Headless agents (no browser) hit the same endpoint directly:

```bash
curl -sS -c cookies.txt -X POST http://localhost:4000/api/agents/sign-in-as
curl -sS -b cookies.txt http://localhost:4000/api/v1/user
```

## Skills

This project includes custom skills to assist with common tasks. Skills are located in `.agents/skills` and `.claude/skills`.
