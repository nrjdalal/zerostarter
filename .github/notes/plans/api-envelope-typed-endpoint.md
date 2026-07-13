# One typed API envelope and a defineRoute helper

- Status: in progress (move 2 shipped; move 1 open)
- Links: 2026-07-12 architecture review (deep-module lens); saas-starter-evals P2-2 (the ~38% router-boilerplate finding); PR #535 (envelope design); resolves openapi-ws-responses (#664)

The `{ data, error }` envelope is emitted server-side (`api/hono/src/lib/error.ts`) and re-derived client-side by shape-sniffing (`web/next/src/lib/api/client.ts` string-matches `"data" in body`), joined only by prose comments; only `ErrorCode` is actually shared, so a server rename degrades silently to `UNKNOWN_ERROR`.

Two moves:

1. **(open)** Export an `Envelope<T>` (and error-envelope) type from `error.ts` and import it into `client.ts` so both adapters type-check against one contract instead of a comment.
2. **(shipped)** A route-doc helper that generates the OpenAPI schema from the Zod validators instead of a hand-written second copy. Landed as `jsonRoute` + `jsonBody` in `api/hono/src/lib/route.ts`, not a single `defineRoute(method, path, io, handler)`: keeping the native `.get/.post(path, ...)` chain preserves Hono RPC inference, which a monolithic wrapper would fight. `jsonRoute` wraps `output` in `{ data }`, expands the `x-codeSamples` from one call expression, and attaches only the error responses that apply (429/500 always; +400 when `validated`; +401 when `auth`). `jsonBody` swaps `sValidator` for hono-openapi's `validator`, so the `requestBody` is generated from the same schema it checks and the two cannot drift. Collapsed the `describeRoute` blocks in `index.ts`, `waitlist.ts`, and `v1.ts`; the now-unused `@hono/standard-validator` dependency was dropped.

Because `jsonRoute` owns which error responses a route documents, the global `defaultOptions` 429/500 injection was removed, which resolves openapi-ws-responses (#664): the WS upgrade route now lists only its `101`.

Optional follow-on (still open): fold the three auth-client seams (`unwrap`, the hand-fetch in `lib/auth/index.ts`, the raw form action in `access.tsx`) toward the one typed client, and consider tightening the response side with hono-openapi's `describeResponse` so the handler return type is checked against the documented schema.
