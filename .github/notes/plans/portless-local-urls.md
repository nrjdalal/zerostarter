# Portless local URLs, follow-ups

- Status: icebox (undecided; tracked in #707)
- Raised by: #702 "Follow-ups (noted, not in this PR)"

#702 serves local dev through named `.localhost` URLs via [portless](https://portless.sh) and moves auth to same-origin host-only. Four loose ends were consciously left out of that PR and put on ice: each may be worth doing, may be required later, or may never matter.

## Rebrand the per-app portless `name` for forks

The portless `.localhost` slug uses the template project name, so a fork's local URLs read `zerostarter.localhost` until `convert.ts` rebrands the per-app portless `name` at init. Local dev works regardless, so this is cosmetic, but a fork that cares about its own local hostnames would want it. Open question: is the fork's local URL worth a convert-time rewrite, or is `PORTLESS_URL` enough for anyone who cares?

## Remove the now-unused `HONO_APP_URL`

#702 deletes `getCookieDomain` / `getCookiePrefix` and uses the web origin as `baseURL`, so `packages/auth` no longer reads `HONO_APP_URL`. Once #702 merges it is dead config, and removing it (from `packages/env` `auth.ts` + `api-hono.ts`, `.env.example`, `turbo.json`, and the env/deploy docs) is a clean sweep. On ice only until #702 lands, so the removal is one pass rather than a merge-conflict magnet against the open PR. This one is most likely to graduate.

## Parallel worktree dev stacks (dynamic ports)

The portless proxy pins `:1355`, so only one dev stack runs at a time and a second worktree's `bun dev` collides on the port. Dynamic port selection (or a per-worktree proxy port) would let parallel worktree stacks coexist. Whether it is worth it is the open question: `PORTLESS=0 bun dev` already falls back to plain localhost per worktree, which sidesteps the collision for anyone who needs two stacks today.

## Authenticated WebSocket ticket pattern

#702 hardened the WS upgrade with a trusted-origin check only. A short-lived, single-use ticket (minted over the authenticated HTTP session and presented on connect) would authenticate the socket itself rather than trusting the origin. This is a pattern to add when a real authenticated WS feature needs it, and possibly a false urgency until then: the current health-status socket carries nothing sensitive.
