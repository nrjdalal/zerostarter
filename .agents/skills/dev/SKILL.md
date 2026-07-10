---
name: dev
description: Start, restart, and verify the ZeroStarter dev stack (Next.js on 3000, Hono API on 4000). Use when asked to run the app, when the API returns NOT_FOUND for routes that exist in source, or before browser testing.
---

# Dev Stack

`bun dev` (`turbo run dev --ui tui`) needs an interactive terminal. Run stream mode detached instead.

## Start

```bash
(bunx turbo run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
curl -sf --retry 60 --retry-delay 1 --retry-connrefused http://localhost:4000/api/health > /dev/null
curl -sS http://localhost:4000/api/health           # {"data":{"message":"ok",...}}
curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/   # 200
```

Ready when the health curl prints `"message":"ok"` and `/` returns `200`.

- Scalar API docs: http://localhost:4000/api/docs
- Logs: `tail -f /tmp/zerostarter-dev.log`

## Stale-route trap

The API dev task runs `bun --hot src/index.ts`, and **`--hot` does not pick up newly created files** (new routers, new schema exports). Symptom: a route that exists in source returns `{"error":{"code":"NOT_FOUND"}}`. Touching files does not clear it; only a full restart does:

```bash
lsof -nP -iTCP:3000 -iTCP:4000 -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2}' | sort -u | xargs kill -9 2>/dev/null
pkill -f "turbo run dev" 2>/dev/null
sleep 2
(bunx turbo run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
curl -sf --retry 60 --retry-delay 1 --retry-connrefused http://localhost:4000/api/health > /dev/null
```

The lsof kill is port-scoped, but `pkill -f "turbo run dev"` matches any process running turbo dev regardless of port. Before restarting, confirm nothing unrelated owns 3000/4000 AND no other project is running `turbo run dev`, or you take it out too. Done when the previously-NOT_FOUND route responds.

Restart the same way after changing `@packages/*` exports the API consumes; they resolve to built dist, so run `bunx turbo run build --filter=@packages/<name>` first.

## Agent login

Sign in as `LocalAgent` (local only, trusted Origin required):

```bash
curl -sS -c cookies.txt -X POST -H "Origin: http://localhost:3000" http://localhost:4000/api/agents/sign-in-as
curl -sS -b cookies.txt http://localhost:4000/api/v1/user
```

In the browser: click **Login** in the top navbar (hidden on `/console` and `/dashboard`), then **Login (agents)** in the dialog (development only).
