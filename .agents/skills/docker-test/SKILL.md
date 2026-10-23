---
name: docker-test
description: Build and smoke-test the Docker images with docker compose, and in the canonical starter run the golden end-to-end suite against them. Use when touching a Dockerfile, the bundle build, compose config, or a *.e2e.test.ts.
source: local
---

# Docker Testing

Production's Dockerfiles, built and run through compose, then proved offline, single-libc, and golden. Compose names images after the checkout directory, so every command goes through compose rather than an image name.

## 1. Build and up

```bash
docker compose build --no-cache && docker compose up -d
```

One service while iterating:

```bash
docker compose build --no-cache api && docker compose up -d api
# Docker's port proxy accepts before the process listens, so poll rather than --retry-connrefused
for i in $(seq 1 30); do curl -sf http://localhost:4000/api/health > /dev/null && break; sleep 1; done
docker compose logs -f api
docker compose down
```

The build reads `.env` through the `dotenv` secret compose wires; a missing file fails it, and a clean checkout takes the dummy from section 5. With no daemon, `open -a Docker` and poll `docker info`. Done when api's health answers 200 on `4000` and, with both services up, web's `/` answers 200 on `3000` after its redirect where it has one (`curl -L`: a fork with the waitlist feature on sends `/` to `/waitlist`).

## 2. Offline check

The api runner ships only `bundle/`, so an import the bundle does not carry would auto-install from npm at cold start or on a later request; the image runs `bun --no-install`, so it fails at once instead. Prove it with no network:

```bash
sed 's/ #.*//' .env > .env.docker
docker run -d --name t-offline --network=none --env-file .env.docker "$(docker compose config --images api)"
docker exec t-offline sh -c 'for i in $(seq 1 30); do wget -qO- http://localhost:4000/api/health && exit 0; sleep 1; done; exit 1'
docker logs t-offline   # on failure, "Cannot find package 'X'" names the import the bundle lacks
time docker exec t-offline bun -e 'const r = await fetch("http://localhost:4000/api/agents/sign-in-as", { method: "POST", headers: { Origin: "http://localhost:3000" } }); console.log(r.status, await r.text())'
docker diff t-offline | grep .bun/install/cache
docker rm -f t-offline
```

Health alone proves nothing about sign-in: Better Auth's guarded `@opentelemetry/api` import fires inside its first span, the first auth call of any kind rather than boot (every auth endpoint and every adapter call opens one), and the agent sign-in, which calls the adapter directly, is that call. It reaches the adapter only when the route is mounted and the `Origin` trusted, so `.env.docker` needs `NODE_ENV=local`, `AGENT_SIGNIN_ENABLED=true` and `http://localhost:3000` in `HONO_TRUSTED_ORIGINS`, as section 5's dummy has. With a deploy's `.env` it answers a 404, and with one that does not trust that origin a 500 `AGENT_LOGIN_FAILED` naming `untrusted Origin`, both before Better Auth is touched, so neither proves anything. Past both, it answers a 500 `INTERNAL_SERVER_ERROR` within a second, since no database is reachable; a stall means the `--no-install` guard left the image's command. The sign-in goes through `bun -e` rather than `wget` because the image's `wget` is BusyBox, which prints only the status line of an error response, so the two 500s would look the same; a script with no imports installs nothing. Done when health answers, the sign-in prints `500` with `"code":"INTERNAL_SERVER_ERROR"` within a second, and the `docker diff` prints nothing.

## 3. Single-libc check

The web build prunes the unused libc stack: `web/next/next.config.ts` detects the image's libc at build (alpine is musl), so the glibc `sharp` and `@takumi-rs` binaries leave output tracing. Drift in the store layout or a dependency rename re-bloats the image silently, so assert after every web build:

```bash
docker compose run --rm --entrypoint sh web -c \
  'find /app/node_modules \( -name "*linux-*-gnu*" -o -name "*sharp-linux-*" -o -name "*libvips-linux-*" \) ! -type l | grep . && echo "FAIL: glibc stack shipped" && exit 1; echo OK'
```

`! -type l` skips the dangling glibc-named symlinks the pruning leaves; only real files count. Done when it prints `OK`; a hit means the excludes in `next.config.ts` stopped matching, so update the patterns until it does.

## 4. Golden suite

Canonical starter only (`tests/` is fork-excluded). With the stack up on a fresh disposable database, every `*.e2e.test.ts` under `tests/` drives it over HTTP:

```bash
E2E_POSTGRES_URL=postgres://postgres:postgres@localhost:<port>/postgres bun run test:e2e
```

`E2E_API_URL` and `E2E_WEB_URL` default to the compose ports, and the suite runs from the worktree, so `bun install` first. It signs in as `LocalAgent`, asserts the stage is `local`, snapshots the providers list, and writes through the API, so `.env` holds the following, which opens the agent sign-in to the network (section 5 has the exposure):

- `AGENT_SIGNIN_ENABLED=true`
- both OAuth pairs filled, id and secret (the dummy recipe does): a provider registers only with both halves, and the snapshot lists all three
- `NODE_ENV=local`
- a disposable `POSTGRES_URL` (`bunx pglaunch@5.5.7 -k`), migrated first with `bun run db:migrate`, in the `localhost` form it prints: under compose's `INTERNAL_API_URL`, `@packages/env` rewrites that host to `host.docker.internal` so the api container reaches it. Docker Desktop resolves that name; Linux Docker Engine resolves it only with `extra_hosts: ["host.docker.internal:host-gateway"]` on the api service, which `docker-compose.yml` does not set, so add it there in a scratch checkout. The URL is read at boot, so after the swap `docker compose up -d` recreates the containers; a rebuild is only for a value the build bakes in

`tests/stack.ts` refuses an `E2E_*_URL` whose host is not local and an `E2E_POSTGRES_URL` holding any account beyond the agent and the seed; that variable unlocks the second-account role and ban flows. A snapshot mismatch is a contract change: review it, then `bun run test:e2e --update-snapshots`. Done when it prints `0 fail` twice in a row; the second run proves the goldens deterministic and the cleanup complete.

## 5. .env

A clean checkout has no real `.env`; a smoke build takes a dummy from `.env.example` with the required blanks filled:

```bash
sed -e 's|^AGENT_SIGNIN_ENABLED=$|AGENT_SIGNIN_ENABLED=true|' \
    -e 's|^BETTER_AUTH_SECRET=$|BETTER_AUTH_SECRET=dummy|' \
    -e 's|^GITHUB_CLIENT_ID=$|GITHUB_CLIENT_ID=dummy|' \
    -e 's|^GITHUB_CLIENT_SECRET=$|GITHUB_CLIENT_SECRET=dummy|' \
    -e 's|^GOOGLE_CLIENT_ID=$|GOOGLE_CLIENT_ID=dummy|' \
    -e 's|^GOOGLE_CLIENT_SECRET=$|GOOGLE_CLIENT_SECRET=dummy|' \
    -e 's|^POSTGRES_URL=$|POSTGRES_URL=postgres://dummy:dummy@localhost:5432/dummy|' \
    .env.example > .env
```

Empty optionals pass through `emptyStringAsUndefined`. Three things no config confesses:

- `--no-cache` after any `.env` edit: secret contents are not part of BuildKit's cache key, so a plain rebuild ships stale baked values (web's `NEXT_PUBLIC_*`, the cookie scope from `HONO_APP_URL`).
- A dummy-built web image carries its `NEXT_PUBLIC_*` forever, since Next inlines them at build: a smoke build is disposable, and a deploy image builds with the real `.env`.
- `docker run --env-file` keeps inline comments, so `HONO_RATE_LIMIT=60 # note` fails validation; compose strips them, and a direct run sanitizes first with `sed 's/ #.*//' .env > .env.docker`.

Ports `3000` and `4000` collide with a running dev stack; bump the compose mappings (`14000:4000`) in a scratch checkout for side-by-side. Compose publishes both on every network interface, and this dummy, like the suite's `.env` in section 4, mounts the agent sign-in (`NODE_ENV=local` with the flag `true`), whose trusted-`Origin` check stops only browser pages, so any host on the network can sign in as `LocalAgent`, an owner from the call that creates the account until someone demotes it: run the stack on a network you trust, or publish `127.0.0.1:3000:3000` and `127.0.0.1:4000:4000` in a scratch checkout.

Done when `.env` holds every required value and every image built since its last edit was built with `--no-cache`.

## 6. Browser sign-in

Against the images the **Login (agents)** button is absent: its guard is Next's build-time `NODE_ENV`, so a production build compiles it out. Submit the form it posts from the page's console instead:

```js
document.body.appendChild(Object.assign(document.createElement("form"), { method: "POST", action: "http://localhost:4000/api/agents/sign-in-as" })).submit()
```

Done when the 302 lands on the dashboard signed in as `LocalAgent`.
