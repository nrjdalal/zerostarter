---
name: dev
description: Start, restart, and verify the ZeroStarter dev stack. `bun run dev` serves portless named `.localhost` URLs (branch-prefixed in a worktree); resolve them with `bunx portless get`. Use when asked to run the app, when the API returns NOT_FOUND for routes that exist in source, or before browser testing.
source: local
---

# Dev Stack

`bun run dev` runs both apps (Next.js web + Hono API) through **portless**: stable named `.localhost` URLs off one unprivileged HTTP proxy on `:1355`, instead of raw ports. In a linked worktree the branch name prefixes each host, so parallel worktrees never collide on a port. They do share the auth session, since the cookie is scoped to the base `.localhost` domain, so signing in on one worktree's URL signs you in on the others. Bare `bun run dev` uses turbo's TUI, which needs an interactive terminal; run stream mode detached instead.

## Start

Start it from a shell that has not exported `NODE_ENV`. The worktree commit recipe exports `NODE_ENV=production`, and a stack started under it boots in the production stage: `/api/health` still answers ok, but the agent sign-in route is gone and the end-to-end suite fails wholesale. `unset NODE_ENV SKIP_ENV_VALIDATION` first; the stage then comes from `.env`, and `/api/health` names it in `environment`.

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

**Fixed ports:** `PORTLESS=0 bun run dev` skips the proxy and serves web on `:3000`, api on `:4000` (the ports the curl examples in other skills assume). It runs a single stack only: two worktrees on fixed ports collide, which is why portless is the default.

## Stale-route trap

The API dev task runs `bun --hot src/index.ts`, and **`--hot` does not pick up newly created files** (new routers, new schema exports). The symptom is a route that exists in source returning `{"error":{"code":"NOT_FOUND"}}`. Touching files does not clear it; only a full restart does:

```bash
# Kill this checkout's dev processes: turbo, plus the children it leaves behind.
# A linked worktree lives under the primary checkout, so its stack is skipped by path.
ROOT=$(git rev-parse --show-toplevel)
# The shared proxy is itself a portless process, and it lives wherever the first stack to start ran, so it is spared by port, not by path
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

Killing turbo alone is not enough: `pkill -f "turbo run dev"` matches the turbo processes and none of the children they spawned, and the survivors include both `next-server`, which keeps its port so the next `bun run dev` dies with "Another next dev server is already running", and the `.bin/portless` supervisors that hold the route registration. It is also worktree-blind, so it would take down another worktree's stack. Hence the wide pattern, narrowed by each process's own working directory. The shared proxy needs the extra guard because it matches that pattern too and its own directory says nothing about who depends on it: whichever stack started first hosts it, and killing it drops routing for every worktree on the machine. It is found by the port it listens on, `PORTLESS_PORT` or 1355, so a fork that moves the port keeps the protection. The shared portless proxy keeps running either way, and this worktree's apps re-register on restart; `bunx portless list` showing no route for this branch confirms the old stack is gone. Done when the previously-NOT_FOUND route responds.

Restart the same way after changing `@packages/*` exports the API consumes: they resolve to built dist, so run `bunx turbo run build --filter=@packages/<name>` first.

`/api/health` can report a build SHA one commit behind `HEAD` after a restart. The SHA is baked into `@packages/env` at build time (`packages/env/tsdown.config.ts` reads `git rev-parse --short HEAD`), and turbo replays a cached build when only the commit changed, since that task's inputs are its own files plus the root `package.json`, none of which a plain commit elsewhere touches. Force it with `bunx turbo run build --filter=@packages/env --force`; the number itself is right either way.

## Agent login

Sign in as `LocalAgent` (local only, trusted Origin required). The route is gated on `AGENT_SIGNIN_ENABLED`: set it to `true` in `.env` first, or the route 404s. It is off by default, so a fresh clone and any deploy expose no session-minting route.

```bash
WEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)
curl -sS -c cookies.txt -X POST -H "Origin: $WEB" "$API/api/agents/sign-in-as"
curl -sS -b cookies.txt "$API/api/v1/user"
```

In the browser: click **Login** in the top navbar (hidden on `/console` and `/dashboard`), then **Login (agents)** in the dialog (development only, with `AGENT_SIGNIN_ENABLED=true`).
