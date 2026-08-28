# One typed API envelope and a defineRoute helper

- Status: backlog
- Links: 2026-07-12 architecture review (deep-module lens); PR #535 (envelope design); subsumes [openapi-ws-responses](openapi-ws-responses.md) (#664)

The `{ data, error }` envelope is emitted server-side (`api/hono/src/lib/error.ts`) and re-derived client-side by shape-sniffing (`web/next/src/lib/api/unwrap.ts` string-matches `"data" in body`), joined only by prose comments; only `ErrorCode` is actually shared, so a server rename degrades silently to `UNKNOWN_ERROR`. Separately, every documented route hand-writes the same ~30-line `describeRoute` scaffold (the `z.object({ data })` wrapper, the `200/OK` content block, the `x-codeSamples`), and the auth/validation error responses are attached by a per-route spread that nothing forces to match the runtime behaviour.

Two moves:

1. Export an `Envelope<T>` (and error-envelope) type from `error.ts` and import it into `client.ts` so both adapters type-check against one contract instead of a comment.
2. Add a `defineRoute(method, path, io, handler)` helper that wraps `{ data }`, mounts the validator (throwing `ApiError`), and auto-attaches `validationErrorResponses`/`authErrorResponses` from the presence of input/auth. Collapses the describeRoute blocks in `index.ts`, `waitlist.ts`, and `v1.ts` to ~8 lines each, and makes it impossible to mount auth/validation without documenting 401/400.

Because the helper owns which error responses a route documents, this subsumes openapi-ws-responses (#664): the WS upgrade route stops listing inapplicable 429/500. Keep the deliberate `{ data, error }` unwrap from PR #535 (this deepens the type contract and collapses boilerplate, it does not replace the unwrap). Optional follow-on: fold the three auth-client seams (`unwrap`, the hand-fetch in `lib/auth/index.ts`, the raw form action in `access.tsx`) toward the one typed client. Medium-large effort.
