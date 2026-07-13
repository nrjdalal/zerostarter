# The OpenAPI journey (every spec change, with reasons)

Reconstructed from git history + PR bodies. Chronological. "Reason" is the recorded intent (commit/PR) or, for terse solo commits, the reason the diff makes plain.

## Phase 0 - before OpenAPI (2025-11 -> 2026-01)

- `83ecd4da` (2025-11-29) `feat: init awesomeness` - first Hono API. Request validation via `@hono/zod-validator`'s `zValidator` on a `"query"` example. No spec.
- Dec 2025: `isolate env per pkg`, `not found and error logging`, `port default for hono`, `enhance api/hono` - API hardening, still no spec.
- `827cafdb` (2026-01-15) `feat: better observability`.

## Phase 1 - hono-openapi arrives (2026-01-21, #279)

- `f29f3fde` `feat: init hono-api` - adopted **hono-openapi**: `describeRoute` + `resolver` + `openAPIRouteHandler`, Scalar UI at `/api/docs`, OpenAPI `info.version` = `"0.0.1"`. Reason: give the API a documented, typed OpenAPI surface. The get-session example used **hono-openapi's own `validator`** (imported `validator as zValidator`) on a `"query"` param, so the param fed the spec.
- `b1274faf` (#281, #283) `chore: add x-code-samples` - added `x-codeSamples` (hono/client) to health/auth/user so Scalar shows real usage; #283 clarified the full/partial/empty session response shapes.
- `40b06e54` (#289) `docs(openapi): add refs and sync`.

## Phase 2 - pull hono-openapi's validator back out (2026-01-22, #287)

- `7a82baf0` `chore: remove query param example` - deleted the get-session `select` query param and its **7-shape `z.union` response**, so the endpoint always returns `{ session, user }`; added structured `401`s. This removed the `validator as zValidator` (hono-openapi) import. **Framed as a simplification, not "the validator broke."** After this the API had no request validators; `describeRoute` owned the spec by hand.

## Phase 3 - versioning + the first response envelope (2026-01-24 -> 01-30)

- `49a75a71` (#294) / `9a6bac57` (#296) `feat: show versioning` (v1, v2), `8b4bea0c` `version size reduce`, `876e49e8` `update links in /api/docs` - surface the build version in the API/spec and tidy the Scalar links.
- `4467baac` (2026-01-28) `feat: hono rate limiter` (+ `a547c96d` middleware) - adds the rate limiter; `429` becomes a reachable status (documented later).
- `d2c59cd1` (2026-01-30, #336) `feat: standardize api response` - **birth of the envelope.** Replaced an ad-hoc `metadataMiddleware` (a request-metadata logger/response-wrapper) with a uniform `{ data }` success / `{ error: { code, message } }` failure shape; wrapped every response schema in `{ data }`. Reason: one predictable response shape instead of the metadata wrapper.
- `8dd96cf3` `chore: improved error handling` - introduced `lib/error.ts` (centralized error shaping).

## Phase 4 - agent emulate detour (2026-04 -> 05)

- `e903dfbf` .. `49b6585a` - `@packages/emulate` for headless agent OAuth login, later collapsed into auth + api/hono. Peripheral to the spec.

## Phase 5 - brand into the spec (2026-06-21, #491)

- `78965ad2` `refactor(config): centralize brand identity` - OpenAPI `info.title` / `info.description` now come from `site.name` / `site.apiReferenceDescription`.

## Phase 6 - first real validation, on sValidator (2026-06-21, #523)

- `47cb44a7` -> `9af18985` `feat(waitlist): public signup` - the waitlist POST is the first route that validates a body. It used **`sValidator` from `@hono/standard-validator`**, not hono-openapi's `validator`. The initial hook returned `jsonError(...)`; later reworked to `throw ApiError`. PR verification explicitly lists "web RPC inference of `apiClient.waitlist`." **No recorded reason for sValidator-over-validator; it was simply the choice for the first validated route, and `@hono/standard-validator` had been a dependency since `bd14d87b` (2026-01-29, "add hono validator").**

## Phase 7 - the { data, error } envelope + OpenAPI error docs (2026-06-22 -> 23, #535)

Granular commits `54b9ff81`, `1569bbb6`, `9b60b70f`, `2b3f2dbe`, `747906bf`, `ba7b8eee`, folded into `b2058eef`:

- Client `unwrap` -> `{ data, error }` (never throws), documented in Scalar via `x-codeSamples`.
- Server: per-route **reachable-status** error docs - `2b3f2dbe` "scope OpenAPI error responses to each route's reachable statuses": `429/500` global via `index.ts` `defaultOptions` (`globalErrorResponses`), `+401` on auth routes, `+400` on validated routes; "200 first, errors after," each with its own example.
- `ba7b8eee` "return 400 for malformed request bodies and surface validation issues": `errorHandler` maps `ZodError -> 400 VALIDATION_ERROR` with `issues`, and honors `HTTPException` status instead of masking everything as 500.

## Phase 8 - error model hardening (2026-06-25, #553 / #556)

- `d4d87647` (#553) `contained error handling + typed ErrorCode union end-to-end` - `ApiError extends HTTPException`; `onError` is the single switchboard (`ApiError -> ZodError -> HTTPException -> 500`); routes **throw** instead of hand-building envelopes; one alphabetized `ErrorCode` union in `lib/error.ts`, re-exported to the web client as a closed set.
- `#556` `jsonError code/message win over extra` - precedence fix + doc-sync (the blog/project-structure reproductions).

## Phase 9 - WebSockets (2026-07-06 #661, 2026-07-12 #674)

- `1bd483c0` (#661) `stream system health over a WebSocket` - `/api/health/ws`, a GET upgraded with `upgradeWebSocket`; documented via `describeRoute` as a bare `101` (OpenAPI can't schema-type WS frames, so the frame shape is prose). Reason: live status demo behind the landing "operational" badge.
- `e8578b64` (#674) `serve WebSockets on Vercel via the Node adapter` - `hono/bun` WS is coupled to `Bun.serve()`, which Vercel Functions don't run, so the upgrade silently fell back to REST; branch on `process.env.VERCEL` to use `@hono/node-server` + `ws` there.

## Phase 10 - feature-gate the spec (2026-07-12/13, #691 + `0f026757`, `6b1a4db2`)

- Gate the Scalar UI **and** `/api/openapi.json` on the `apiDocs` flag. `0f026757` "gate the OpenAPI spec on apiDocs, not just the Scalar UI" - reason: gating only the UI would leave the full spec public. Off = both 404, nav link hidden.

## Phase 11 - generate schemas from the validators (2026-07-14, #700, this branch)

- `626f8d40` `refactor(api): generate OpenAPI schemas from the Zod validators` - `jsonRoute` + `jsonBody` (`lib/route.ts`) generate the doc from the Zod validators (no hand-written second copy). `jsonBody` swaps `sValidator` -> hono-openapi's `validator`, so the `requestBody` is generated from the schema it validates. Removing `defaultOptions` (errors now per-route via `jsonRoute`) drops the inapplicable `429/500` from `/api/health/ws` (resolves #664). Dropped the now-unused `@hono/standard-validator`.
- `route.guard.ts` - compile-time guard that fails `check-types` if a hono-openapi bump loosens the typed client.

## The validator question - what the history does and does not say

- **Does say:** the validator lineage is `@hono/zod-validator` -> hono-openapi `validator` (get-session query example only) -> removed as a simplification (#287) -> `@hono/standard-validator` `sValidator` for the first real validation (#523) -> [#700 swaps back to hono-openapi `validator`].
- **Does NOT say:** no commit, PR, issue, or note anywhere states that hono-openapi's `validator` "degraded functionality." hono-openapi's `validator` was never used for a real body validator in committed history; it only ever documented the (removed) query example.
- **Reproduction on repo-pinned versions:** across `hono-openapi` 1.1.2 / 1.3.0 / 1.3.1 (the only versions the repo ever pinned), plus an isolated json+query+union harness, the `validator`'s RPC input types, `c.req.valid()`, response types, and runtime are byte-identical to `sValidator`. No degradation reproduces on any pinned version.
- **The repo never ran 0.x.** hono-openapi entered at `1.1.2` (`f29f3fde`), already Standard-Schema / zod-v4 based. So the get-session query example ran on the 1.x `validator`, not 0.x.

## 0.x reproduction result (isolated experiment)

**hono-openapi's `validator` did NOT degrade Hono RPC inference at any version tested.** 0.1.5, 0.2.0, 0.4.8, and 1.3.1 (control) all produced the strict client type `{ json: { email: string } }`, a correctly-typed `c.req.valid("json")`, and correct `@ts-expect-error` behavior on wrong calls. No `TS2578` fired anywhere. The harness was proven honest with a negative control: a route with no validator DID trip `TS2578`, so it genuinely detects loosened inference; 0.x simply never loosened it.

The real 0.x -> 1.x difference is plumbing, not type quality:

- **0.x**: `validator`/`resolver` at the subpath `hono-openapi/zod`; requires **zod v3** + `@hono/zod-validator` + `zod-openapi` peers. Its exported `validator` IS `@hono/zod-validator`'s `zValidator` (why old code imported `validator as zValidator`).
- **1.x**: `validator`/`describeRoute`/`resolver` at the main entry, Standard-Schema based (zod v4), `@hono/standard-validator` peer.

## Conclusion on the validator "degradation"

There is **no evidence, in this repo's history or by reproduction across 0.x -> 1.3.1, that hono-openapi's `validator` degraded RPC types, `valid()` types, response types, runtime validation, or the spec.** The switch to `sValidator` (#523) was the natural choice for the first validated route, not a documented reaction to a regression. If a real motivation existed it was ecosystem ergonomics (0.x's zod-v3-only peers, the extra peer surface, split-subpath imports), not typed-client quality, and even that never applied here because the repo started on 1.x. #700 swaps to the `validator` with zero measured regression, and `route.guard.ts` pins the typed client so any future hono-openapi regression fails `check-types`.
