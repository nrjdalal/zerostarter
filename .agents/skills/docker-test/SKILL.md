---
name: docker-test
description: Build and smoke-test the Docker images with docker compose. Use when touching Dockerfiles, the bundle build, compose config, or anything that changes how containers are packaged.
---

# Docker Testing

Canonical flow (full stack, mirrors the production images):

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

## .env requirements

- Builds consume `.env` as a BuildKit secret (compose wires `secrets: dotenv` from `./.env`; plain builds pass `--secret id=dotenv,src=.env`). The file mounts only during the build RUN and never lands in a layer; env validation runs in full during the build. Missing `.env` fails fast and clearly (compose: secret file not found; docker build: secret not provided).
- Real images get the real `.env`. Simulation/smoke builds on a clean checkout get a dummy, `.env.example` with the empty required values filled in:

  ```bash
  sed -e 's|^BETTER_AUTH_SECRET=$|BETTER_AUTH_SECRET=dummy|' \
      -e 's|^GITHUB_CLIENT_ID=$|GITHUB_CLIENT_ID=dummy|' \
      -e 's|^GITHUB_CLIENT_SECRET=$|GITHUB_CLIENT_SECRET=dummy|' \
      -e 's|^GOOGLE_CLIENT_ID=$|GOOGLE_CLIENT_ID=dummy|' \
      -e 's|^GOOGLE_CLIENT_SECRET=$|GOOGLE_CLIENT_SECRET=dummy|' \
      -e 's|^POSTGRES_URL=$|POSTGRES_URL=postgres://dummy:dummy@localhost:5432/dummy|' \
      .env.example > .env
  ```

  (empty optionals like `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=` pass via `emptyStringAsUndefined`)
- Dummy-built images are for smoke tests ONLY, never promote one to a deploy: Next inlines `NEXT_PUBLIC_*` into the bundle at build, so a dummy-built web image carries dummy URLs forever. Deploy images must build with the real `.env`.
- Secret contents are NOT part of BuildKit's cache key: after editing `.env`, a plain rebuild can reuse the cached build RUN and silently ship stale baked values (web's `NEXT_PUBLIC_*`). Rebuild with `--no-cache` after env changes.
- Runtime requires `.env` too: compose `env_file: .env` for `up`; an invalid runtime env fails the container loudly at boot.
- `docker run --env-file` does NOT strip inline comments: `HONO_RATE_LIMIT=60 # note` arrives as `"60 # note"`, coerces to NaN, and validation rejects it. Compose's env_file parser strips them. For direct `docker run`, sanitize first: `sed 's/ #.*//' .env > .env.docker`.
- `SKIP_ENV_VALIDATION=true` has no place in the Docker flow: the build mounts a real `.env` secret and runtime loads `.env`, so both validate real values. The flag no longer bypasses validation anyway; it only substitutes shape-valid dummies for *missing* required vars while zod defaults and transforms still run (`HONO_PORT` defaults to 4000, `HONO_TRUSTED_ORIGINS` parses into an array). Reserve it for contexts that genuinely lack a `.env` (CI). The web deploy uses the narrower `SKIP_ENV_VALIDATION_SERVER`, which falls back only server secrets while still validating the `NEXT_PUBLIC_*` it inlines.
- Without a reachable `POSTGRES_URL`, DB-backed routes (e.g. `/api/v1/user`) return 500 while `/api/health` stays green. Full e2e needs a real database URL.
- The host ports (`4000`, `3000`) collide with a running dev stack; for side-by-side testing bump the compose mappings (e.g. `14000:4000`) in a scratch checkout.

## Self-containment check (catches runtime auto-install)

When no `node_modules` exists, Bun auto-installs missing imports from npm at runtime, a container that "works" online may be quietly downloading packages on every cold start. The api runner stage ships only `bundle/`, so the bundle must be fully self-contained. Verify offline:

```bash
docker run -d --name t-offline --network=none --env-file .env <image>
docker exec t-offline sh -c 'for i in $(seq 1 30); do wget -qO- http://localhost:4000/api/health && exit 0; sleep 1; done; exit 1'
docker logs t-offline        # on failure: "Cannot find package 'X'" = unresolved import
docker rm -f t-offline
```

Forensics on an online container: `docker diff <name> | grep .bun/install/cache`, entries there mean auto-install fired (history: `--external hono` in the bundle build did exactly this; hono was fetched from npm at cold start).

## Single-libc check (web image, catches silent re-bloat)

The web build prunes the unused libc stack from standalone (libc auto-detected at build). Pattern drift (store layout changes, dep renames) regresses silently into bloat, so assert after any web image build (`! -type l`: dangling glibc-named symlinks are expected leftovers, only real content counts):

```bash
docker run --rm --entrypoint sh zerostarter-web -c \
  'find /app/node_modules \( -name "*linux-*-gnu*" -o -name "*sharp-linux-*" -o -name "*libvips-linux-*" \) ! -type l | grep . && echo "FAIL: glibc stack shipped" && exit 1; echo OK'
```

Expect `OK`. Any hit means the excludes in `web/next/next.config.ts` stopped matching; fix the patterns, never delete the assertion.

## Notes

- Start the daemon if needed: `open -a Docker`, then poll `docker info` until ready.
- Build context is gitignore-shaped via `.dockerignore`, including the env stance: real `.env*` files are EXCLUDED from the context (only `.env.example` enters); the secret mount reads from the host and bypasses the context entirely, so no build can land `.env` contents in a layer.
