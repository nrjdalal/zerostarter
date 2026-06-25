---
name: dev
description: Start, restart, and verify the ZeroStarter dev stack (Next.js on 3000, Hono API on 4000). Use when the user asks to run the app, when the API returns NOT_FOUND for routes that exist in source, or before browser testing.
---

# Dev Stack

`bun dev` runs `turbo run dev --ui tui`, which needs an interactive terminal. Agents use stream mode in the background instead.

## Start

```bash
(bunx turbo run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
curl -sf --retry 60 --retry-delay 1 --retry-connrefused http://localhost:4000/api/health > /dev/null
curl -sS http://localhost:4000/api/health           # {"data":{"message":"ok",...}}
curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/   # 200
```

- Web: http://localhost:3000, API: http://localhost:4000 (Scalar docs at `/api/docs`)
- Logs: `tail -f /tmp/zerostarter-dev.log`

## Known trap: stale API routes

The API dev task runs `bun --hot src/index.ts`, and **`--hot` does not pick up newly created files** (new routers, new schema exports). Symptom: a route that exists in source returns `{"error":{"code":"NOT_FOUND"}}`. Touching files does not help. Fix is a full restart:

```bash
lsof -nP -iTCP:3000 -iTCP:4000 -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2}' | sort -u | xargs kill -9 2>/dev/null
pkill -f "turbo run dev" 2>/dev/null
sleep 2
(bunx turbo run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
curl -sf --retry 60 --retry-delay 1 --retry-connrefused http://localhost:4000/api/health > /dev/null
```

The kill is port-scoped: confirm nothing unrelated owns 3000/4000 before running it (another project's dev server would be collateral).

Also restart after changing `@packages/*` exports the API consumes (they resolve to built dist; run `bunx turbo run build --filter=@packages/<name>` first).

## Agent login

Sign in as `LocalAgent` (local only, trusted Origin required):

```bash
curl -sS -c cookies.txt -X POST -H "Origin: http://localhost:3000" http://localhost:4000/api/agents/sign-in-as
curl -sS -b cookies.txt http://localhost:4000/api/v1/user
```

In the browser: the **Login (agents)** button in the dev UI (visible on the landing navbar, which renders on `/` only during development).

## Notes

- API requests from curl need `-H "Origin: http://localhost:3000"` for CORS-credentialed routes
- The landing navbar is hidden on `/` outside development; seeing it locally is correct
