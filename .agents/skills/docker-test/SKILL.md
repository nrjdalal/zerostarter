---
name: docker-test
description: Build and smoke-test the Docker images with docker compose. Use when touching a Dockerfile, the bundle build, or compose config.
source: local
---

# Docker Testing

Full stack, the same Dockerfiles prod ships:

```bash
docker compose build --no-cache && docker compose up
```

Scope to one service while iterating:

```bash
docker compose build --no-cache api && docker compose up -d api
curl -sf --retry 30 --retry-delay 1 --retry-connrefused http://localhost:4000/api/health
docker compose logs -f api
docker compose down
```

## .env

- **Where it comes from.** The build reads `.env` as a BuildKit secret (compose wires `secrets: dotenv` from `./.env`; a plain build passes `--secret id=dotenv,src=.env`) and validates it in full; `up` loads it via `env_file: .env`. The secret mounts only during the build RUN and never lands in a layer. A missing `.env` fails fast: compose reports "secret file not found", docker build "secret not provided"; invalid runtime env crashes the container loudly at boot.
- **Smoke build vs deploy image.** A clean checkout has no real `.env`, so give a smoke build a dummy from `.env.example` with the required blanks filled:

  ```bash
  sed -e 's|^BETTER_AUTH_SECRET=$|BETTER_AUTH_SECRET=dummy|' \
      -e 's|^GITHUB_CLIENT_ID=$|GITHUB_CLIENT_ID=dummy|' \
      -e 's|^GITHUB_CLIENT_SECRET=$|GITHUB_CLIENT_SECRET=dummy|' \
      -e 's|^GOOGLE_CLIENT_ID=$|GOOGLE_CLIENT_ID=dummy|' \
      -e 's|^GOOGLE_CLIENT_SECRET=$|GOOGLE_CLIENT_SECRET=dummy|' \
      -e 's|^POSTGRES_URL=$|POSTGRES_URL=postgres://dummy:dummy@localhost:5432/dummy|' \
      .env.example > .env
  ```

  Empty optionals (e.g. `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=`) pass via `emptyStringAsUndefined`. A smoke build is disposable: Next inlines `NEXT_PUBLIC_*` into the bundle at build, so a dummy-built web image carries dummy URLs forever. Deploy images build with the real `.env`.
- **`--no-cache` after any `.env` edit.** Secret contents are not part of BuildKit's cache key, so a plain rebuild reuses the cached build RUN and silently ships stale baked values (web's `NEXT_PUBLIC_*`).
- **Skip `SKIP_ENV_VALIDATION`.** Build and runtime both load a real `.env`, so both validate real values. The flag no longer bypasses validation anyway: it only substitutes shape-valid dummies for *missing* required vars while zod defaults and transforms still run (`HONO_PORT` defaults to 4000, `HONO_TRUSTED_ORIGINS` parses to an array). Reserve it for CI, which genuinely lacks a `.env`. The web deploy uses the narrower `SKIP_ENV_VALIDATION_SERVER`, which dummies only server secrets while still validating the `NEXT_PUBLIC_*` it inlines.
- **`NODE_ENV` is read at runtime.** The API bundle is built with `bun build --env disable`, so bun does not bake `process.env.NODE_ENV` from the build shell, where `.env` is never sourced and the value would always be "development". What `up` loads from `.env` wins: `/api/health` reports it as `environment`, and `NODE_ENV=local` with `AGENT_SIGNIN_ENABLED=true` mounts the agent sign-in inside the container.
- **Database.** Without a reachable `POSTGRES_URL`, DB-backed routes (e.g. `/api/v1/user`) return 500 while `/api/health` stays green. The end-to-end suite below needs one: a disposable container (`bunx pglaunch -k`), written into `.env` as `host.docker.internal:<port>` so the containers reach it, and migrated first with `POSTGRES_URL=<the localhost form> bun run db:migrate`.
- **Direct `docker run --env-file`** does not strip inline comments: `HONO_RATE_LIMIT=60 # note` arrives as `"60 # note"`, coerces to NaN, and validation rejects it. Compose's parser strips them; for `docker run`, sanitize first: `sed 's/ #.*//' .env > .env.docker`.
- **Ports** `4000` and `3000` collide with a running dev stack; for side-by-side testing bump the compose mappings (e.g. `14000:4000`) in a scratch checkout.

## Self-containment check (catches runtime auto-install)

The api runner ships only `bundle/`, so the bundle must resolve every import with no `node_modules`. When one is missing, Bun auto-installs it from npm at runtime, so a container that "works" online may be downloading packages on every cold start. Prove it offline:

```bash
sed 's/ #.*//' .env > .env.docker
docker run -d --name t-offline --network=none --env-file .env.docker <image>
docker exec t-offline sh -c 'for i in $(seq 1 30); do wget -qO- http://localhost:4000/api/health && exit 0; sleep 1; done; exit 1'
docker logs t-offline        # on failure: "Cannot find package 'X'" = unresolved import
docker rm -f t-offline
```

Forensics on an online container: `docker diff <name> | grep .bun/install/cache`; entries there mean auto-install fired (history: `--external hono` in the bundle build fetched hono from npm at cold start).

## Single-libc check (web image, catches silent re-bloat)

The web build prunes the unused libc stack from standalone (libc is auto-detected at build; an alpine base means musl). Store-layout or dep-rename drift regresses it back into bloat silently, so assert after any web image build:

```bash
docker run --rm --entrypoint sh zerostarter-web -c \
  'find /app/node_modules \( -name "*linux-*-gnu*" -o -name "*sharp-linux-*" -o -name "*libvips-linux-*" \) ! -type l | grep . && echo "FAIL: glibc stack shipped" && exit 1; echo OK'
```

Expect `OK`. `! -type l` skips dangling glibc-named symlinks (expected leftovers); only real files count. Any hit means the excludes in `web/next/next.config.ts` stopped matching, so fix the patterns, never delete the assertion.

## End-to-end golden suite

With the stack up on a fresh disposable database, run every `*.e2e.test.ts` under `tests/` against it:

```bash
E2E_POSTGRES_URL=postgres://postgres:postgres@localhost:<port>/postgres bun run test:e2e
```

`E2E_API_URL` and `E2E_WEB_URL` default to the compose ports. The suite signs in as `LocalAgent` and asserts the stage is `local` (so `.env` needs `NODE_ENV=local` and `AGENT_SIGNIN_ENABLED=true`; it is a suite for a local-stage stack, never a deployed one), drives the organization plugin, the console routes, the waitlist and the web pages, and snapshots every contract response after normalizing ids, timestamps and the build version. A snapshot mismatch is a contract change: review it, then `bun test --update-snapshots e2e.test`. The users list assumes LocalAgent is the only account, which is why the database is fresh; `E2E_POSTGRES_URL` is what lets the suite seed and remove a second account for the role and ban flows, and it refuses any host that is not local, so the shared database can never be seeded by mistake; the stack's own `POSTGRES_URL` must be disposable for the same reason, since the suite writes through the API. Done when it prints 0 fail twice in a row: the second run proves the goldens are deterministic and that a run removes what it created (its organization, rules, signups, seeded account and sessions; the audit log keeps its rows by design, and the goldens read only the entries a run adds).

In a browser against the images the **Login (agents)** button is absent: its guard is Next's build-time `NODE_ENV`, so a production build compiles it out. Submit the same form it posts from the page's console, and the 302 lands on the dashboard with the session (cookies on `localhost` do not isolate by port):

```js
document.body.appendChild(Object.assign(document.createElement("form"), { method: "POST", action: "http://localhost:4000/api/agents/sign-in-as" })).submit()
```

## Notes

- Start the daemon if needed: `open -a Docker`, then poll `docker info` until ready.
- `.dockerignore` excludes real `.env*` from the build context (only `.env.example` enters), so the context itself carries no secret.
