# Portless local URLs, follow-ups

- Status: icebox (undecided; tracked in #707)
- Raised by: #702 "Follow-ups (noted, not in this PR)"

#702 bundled two things: serving local dev through named `.localhost` URLs via [portless](https://portless.sh), and moving auth to same-origin host-only. It merged, was reverted (#711), re-landed as #712, and was reverted again (#714). Only the portless half then shipped, as #715; the same-origin auth change is deferred to its own PR and is **not** in canary. Four loose ends were consciously left out and put on ice: each may be worth doing, may be required later, or may never matter.

The split matters for what follows: the first and third are live against shipped code, while the second is blocked on the deferred auth change.

## Rebrand the per-app portless `name` for forks

The portless `.localhost` slug uses the template project name, so a fork's local URLs read `zerostarter.localhost` until `convert.ts` rebrands the per-app portless `name` at init. Local dev works regardless, so this is cosmetic, but a fork that cares about its own local hostnames would want it. Open question: is the fork's local URL worth a convert-time rewrite, or is `PORTLESS_URL` enough for anyone who cares?

## Remove `HONO_APP_URL`, once the deferred auth change lands

The deferred same-origin auth change deletes `getCookieDomain` / `getCookiePrefix` and uses the web origin as `baseURL`, which is what would leave `packages/auth` no longer reading `HONO_APP_URL`. That change is reverted out of canary today, so `HONO_APP_URL` is still live config: `packages/auth/src/index.ts` reads it for `baseURL` and both cookie helpers, and it is declared in `packages/env` (`auth.ts` + `api-hono.ts`), `.env.example`, `turbo.json`, and the env/deploy docs. Blocked on the auth PR, not merely waiting on it: until that lands there is nothing dead to remove. Once it does, the removal is a clean one-pass sweep across those files. This one is most likely to graduate.

## Parallel worktree dev stacks (dynamic ports)

The root `dev` script pins `PORTLESS_PORT=1355`, so only one dev stack runs at a time and a second worktree's `bun run dev` collides on the port. Dynamic port selection (or a per-worktree proxy port) would let parallel worktree stacks coexist. Whether it is worth it is the open question: `PORTLESS=0 bun run dev` already falls back to plain localhost per worktree, which sidesteps the collision for anyone who needs two stacks today.

## Authenticated WebSocket ticket pattern

The deferred auth change hardens the WS upgrade with a trusted-origin check; with it reverted, the upgrade in `api/hono/src/index.ts` has no origin guard at all today. A short-lived, single-use ticket (minted over the authenticated HTTP session and presented on connect) would go further and authenticate the socket itself rather than trust the origin. This is a pattern to add when a real authenticated WS feature needs it, and possibly a false urgency until then: the current health-status socket only broadcasts version, environment, and a timestamp, so it carries nothing sensitive and there is nothing to lock down yet.
