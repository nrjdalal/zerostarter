---
name: dev
description: Start, restart, and verify the dev stack, and sign in as the agent. Use when asked to run the app, when the API returns NOT_FOUND for a route that exists in source, when a shared package's exports changed, or before browser testing.
source: local
---

# Dev Stack

`bun run dev` runs the web app and the API through portless: named `.localhost` URLs off one shared proxy on `:1355`, prefixed with the branch name in a linked worktree, so parallel worktrees never collide on a port. They share the auth session, since the cookie is scoped to `.localhost`. Fixed ports (`PORTLESS=0 bun run dev`, web on `:3000`, api on `:4000`) serve one stack at a time.

## Start

Start from a shell without `NODE_ENV` exported: the commit recipe exports `NODE_ENV=production`, and a stack started under it boots in the production stage, where health still answers but the agent sign-in route is gone. The stage then comes from `.env`, and `/api/health` names it. Bare `bun run dev` opens turbo's TUI, so run stream mode detached:

```bash
unset NODE_ENV SKIP_ENV_VALIDATION
(bun run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
for i in $(seq 1 60); do WEB=$(bunx portless get zerostarter 2>/dev/null); [ -n "$WEB" ] && break; sleep 1; done
API=$(bunx portless get api.zerostarter)
curl -sf --retry 60 --retry-delay 1 --retry-connrefused "$API/api/health" > /dev/null
curl -sS "$API/api/health"                        # {"data":{"message":"ok",...}}
curl -sS -o /dev/null -w "%{http_code}" "$WEB/"   # 200
```

`bunx portless list` shows every active route, the API docs are at `$API/api/docs`, and the log is `/tmp/zerostarter-dev.log`. Done when health prints `"message":"ok"` and `/` returns 200.

## Restart

The API dev task runs `bun --hot`, which never picks up a newly created file: a new router or schema export answers `{"error":{"code":"NOT_FOUND"}}` until a full restart. The same restart follows a change to a `@packages/*` export the API consumes, after `bunx turbo run build --filter=@packages/<name>`, since those resolve to built dist.

```bash
# Kill this checkout's dev processes by their working directory; a worktree under .claude/worktrees/ is skipped
ROOT=$(git rev-parse --show-toplevel)
# The shared proxy is spared by port, since whichever stack started first hosts it for every worktree
PROXY=$(lsof -nP -iTCP:"${PORTLESS_PORT:-1355}" -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' ')
for p in $(pgrep -f "turbo run dev|bun run dev|dev:app|next dev|next-server|src/index.ts|tsdown|portless"); do
  case " $PROXY " in *" $p "*) continue ;; esac
  cwd=$(lsof -a -p "$p" -d cwd -Fn 2>/dev/null | grep ^n | cut -c2-)
  case "$cwd" in
    "$ROOT"/.claude/worktrees/*) ;;
    "$ROOT" | "$ROOT"/*) echo "killing $p ($cwd)" && kill -9 "$p" ;;
  esac
done
sleep 2
(bun run dev --ui stream > /tmp/zerostarter-dev.log 2>&1 &)
API=$(bunx portless get api.zerostarter)
curl -sf --retry 60 --retry-delay 1 --retry-connrefused "$API/api/health" > /dev/null
```

Two gotchas shape the loop: killing turbo alone leaves `next-server` holding its port (the next start dies with "Another next dev server is already running") and the portless supervisors holding the route, and a bare `pkill` is worktree-blind. `/api/health` can report a build SHA one commit behind after a restart, since turbo replays `@packages/env`'s cached build; `bunx turbo run build --filter=@packages/env --force` refreshes it. Done when `bunx portless list` shows no route for this branch after the kill, and the route that was NOT_FOUND responds after the start.

## Agent login

The route is gated on `AGENT_SIGNIN_ENABLED=true` in `.env` (off by default, so a fresh clone and every deploy expose no session-minting route), runs only in the local stage, and requires a trusted `Origin`:

```bash
WEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)
curl -sS -c cookies.txt -X POST -H "Origin: $WEB" "$API/api/agents/sign-in-as"
curl -sS -b cookies.txt "$API/api/v1/user"
```

In the browser: **Login** in the top navbar (hidden on `/console` and `/dashboard`), then **Login (agents)**. Done when `/api/v1/user` returns `LocalAgent`.
