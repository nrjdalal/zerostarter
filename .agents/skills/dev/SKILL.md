---
name: dev
description: Start, restart, and verify the ZeroStarter dev stack. `bun run dev` serves portless named `.localhost` URLs (branch-prefixed in a worktree); resolve them with `bunx portless get`. Use when asked to run the app, when the API returns NOT_FOUND for routes that exist in source, or before browser testing.
---

# Dev Stack

`bun run dev` runs both apps (Next.js web + Hono API) through **portless**: stable named `.localhost` URLs off one unprivileged HTTP proxy on `:1355`, instead of raw ports. In a linked worktree the branch name prefixes each host, so parallel worktrees never collide on a port (they do share the auth session: the cookie is scoped to the base `.localhost` domain, so signing in on one worktree's URL signs you in on the others). `bun run dev` with no flags uses turbo's TUI, which needs an interactive terminal; run stream mode detached instead.

## Start

```bash
(bun run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
# Resolve this worktree's URLs (branch-prefixed); the proxy needs a moment, so retry
for i in $(seq 1 60); do WEB=$(bunx portless get zerostarter 2>/dev/null); [ -n "$WEB" ] && break; sleep 1; done
API=$(bunx portless get api.zerostarter)
curl -sf --retry 60 --retry-delay 1 --retry-connrefused "$API/api/health" > /dev/null
curl -sS "$API/api/health"                        # {"data":{"message":"ok",...}}
curl -sS -o /dev/null -w "%{http_code}" "$WEB/"   # 200
```

Ready when the health curl prints `"message":"ok"` and `/` returns `200`. `bunx portless list` shows every active route.

- Web / API base URLs: `bunx portless get zerostarter` / `bunx portless get api.zerostarter`
- Scalar API docs: `$API/api/docs`
- Logs: `tail -f /tmp/zerostarter-dev.log`

**Fixed ports:** `PORTLESS=0 bun run dev` skips the proxy and serves web on `:3000`, api on `:4000` (the ports the curl examples in other skills assume). Single stack only: two worktrees on fixed ports collide, which is why portless is the default.

## Stale-route trap

The API dev task runs `bun --hot src/index.ts`, and **`--hot` does not pick up newly created files** (new routers, new schema exports). Symptom: a route that exists in source returns `{"error":{"code":"NOT_FOUND"}}`. Touching files does not clear it; only a full restart does:

```bash
pkill -f "turbo run dev" 2>/dev/null
sleep 2
(bun run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
API=$(bunx portless get api.zerostarter)
curl -sf --retry 60 --retry-delay 1 --retry-connrefused "$API/api/health" > /dev/null
```

`pkill -f "turbo run dev"` matches any turbo dev process regardless of worktree; the shared portless proxy keeps running, and this worktree's apps re-register on restart. Before restarting, confirm no other worktree needs the turbo process you are killing. Done when the previously-NOT_FOUND route responds.

Restart the same way after changing `@packages/*` exports the API consumes; they resolve to built dist, so run `bunx turbo run build --filter=@packages/<name>` first.

## Agent login

Sign in as `LocalAgent` (local only, trusted Origin required). The route is gated on `AGENT_SIGNIN_ENABLED`: set it to `true` in `.env` first, or the route 404s. It is off by default, so a fresh clone and any deploy expose no admin-minting route.

```bash
WEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)
curl -sS -c cookies.txt -X POST -H "Origin: $WEB" "$API/api/agents/sign-in-as"
curl -sS -b cookies.txt "$API/api/v1/user"
```

In the browser: click **Login** in the top navbar (hidden on `/console` and `/dashboard`), then **Login (agents)** in the dialog (development only, with `AGENT_SIGNIN_ENABLED=true`).
