# Consolidate env into one schema with callable validation

- Status: idea (speculative)
- Links: 2026-07-12 architecture review (deep-module lens)

`packages/env/src/{api-hono,web-next,auth,db}.ts` are split by importer, not by variable, so shared keys are duplicated: `HONO_APP_URL` and `HONO_TRUSTED_ORIGINS` are declared identically (same transform and pipe) in both `api-hono.ts` and `auth.ts`, `NODE_ENV` is re-declared in all four, and `INTERNAL_API_URL` is validated as a URL in `web-next.ts` but read raw in `db.ts` to sniff Docker. All five modules also run `createEnv` at import time, which is why `SKIP_ENV_VALIDATION` has to exist for builds and tests.

Candidate deepening: declare every key once (`defineEnv({ server, client })`) with a per-consumer `pick`, and replace import-time `createEnv` with a memoized `loadEnv()` so validation is callable (tests pass a fixture and the `lib/polyfill.ts` machinery can go); move the `localhost -> host.docker.internal` rewrite out of the env schema into `packages/db`.

Caveats: the per-app env split is a t3-env convention, and the env package's unused exports are intentional starter surface (a prior won't-fix). This targets the shared-key duplication and the import-time coupling, not the public surface. Speculative: only the duplication and the callable-validation parts are clear wins; confirm the seam should move before touching the split.
