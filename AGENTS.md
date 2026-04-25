# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Instructions

- Do not comment unnecessarily. Only comment if it is absolutely necessary.
- Use `@/` for imports, if applicable.

## Logging in (agents)

In local dev there is a one-shot dev sign-in route. Agents (no browser) hit it directly; humans get a "Login (agents)" button at the top of the auth dialog.

```bash
bun dev                                                              # boots stack
curl -sS -c cookies.txt -X POST http://localhost:4000/api/agents/sign-in-as
curl -sS -b cookies.txt http://localhost:4000/api/v1/user
```

How it works:

- `@packages/emulate` owns the feature: a single `src/index.ts` exports `emulateOAuthConfig` + `emulateAccountLinking()` (consumed by `packages/auth`) and `createAgentsRouter(auth)` (mounted by `api/hono`). It ships a committed `emulate.config.yaml` with one user `agent@local.host`. To eject: `rm -rf packages/emulate` + remove 3 import lines.
- `bun dev` runs `turbo run dev` across all workspaces. `@packages/emulate`'s `dev` task is just `emulate --service github --port 4001` (binary installed locally; config auto-detected).
- Real GitHub/Google OAuth (`socialProviders`) is always registered — with real creds in `.env`, "Continue with GitHub" works as usual.
- In `NODE_ENV=local`, an additional `genericOAuth` provider `github-emulate` is registered, with `accountLinking` so a user can move between real and emulator without `account_not_linked` errors.
- `POST /api/agents/sign-in-as` (Hono route, guarded by `isLocal()`) performs the `github-emulate` OAuth dance server-side and returns 302 to `/dashboard` with the session cookie. Accepts `?user=admin` to log in as a different seeded user.

Stub values for `GITHUB_CLIENT_*` / `GOOGLE_CLIENT_*` are fine in `.env` for local dev — emulate skips client validation when no `oauth_apps` are seeded.

## Skills

This project includes custom skills to assist with common tasks. Skills are located in `.agents/skills` and `.claude/skills`.
