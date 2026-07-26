---
name: api-endpoint
description: "Add a typed Hono API endpoint or WebSocket route: router, OpenAPI docs, validation envelope, and RPC client wiring. Use when adding or modifying routes in api/hono."
source: local
---

# API Endpoint

Every response is an envelope: `{ data }` on success, `{ error: { code, message } }` on failure. Never hand-build the failure envelope, throw `ApiError` and let `errorHandler` (`api/hono/src/lib/error.ts`) shape it in ONE place. OpenAPI comes from `hono-openapi`, end-to-end types from Hono RPC. The reference routers are `api/hono/src/routers/waitlist.ts` (public, body-validated POST) and `api/hono/src/routers/v1.ts` (auth-gated).

## 1. Create the router

`api/hono/src/routers/<name>.ts`:

```ts
import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { ApiError, validationErrorResponses } from "@/lib/error"

const bodySchema = z.object({
  // z.string().trim().pipe(...) for user-supplied strings
  email: z.string().trim().pipe(z.email().max(254)),
})

export const exampleRouter = new Hono().post(
  "/",
  describeRoute({
    tags: ["Example"],
    description: "...",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: resolver(z.object({ data: z.object({ message: z.string() }) })),
          },
        },
      },
      ...validationErrorResponses,
    },
  }),
  // Validation failures throw ApiError so onError shapes the 400 VALIDATION_ERROR envelope in one place.
  sValidator("json", bodySchema, (result) => {
    if (!result.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
    }
  }),
  async (c) => {
    const body = c.req.valid("json")
    return c.json({ data: { message: "ok" } })
  },
)
```

- Spread the matching error-response set into `responses` so its shape shows in the Scalar docs: `...validationErrorResponses` (400) for a validated route, `...authErrorResponses` (401) for an auth route, `...forbiddenErrorResponses` (403) for an admin route, `...notFoundErrorResponses` (404) for one addressing a row by id, and `...conflictErrorResponses` (409) for one that can lose a race to a unique constraint or to a concurrent edit. 429 and 500 are added globally in `index.ts`, so never per route.
- Mirror `waitlist.ts`'s `x-codeSamples` block so Scalar shows the `hono/client` usage (the template above omits it).
- Auth-protected routes go in `v1.ts`, behind `authMiddleware` from `@/middlewares` with `Variables: Session` so `c.get("session")`/`c.get("user")` are typed. A public route gets its own router.
- Console routes go in `routers/admin.ts`, mounted at `/admin` inside `v1.ts` behind the console gate (stacked after `authMiddleware`). Everything there serves the Access section, so the router mounts `consoleAdminMiddleware` and requires admin throughout. That middleware is one instance of `requireConsoleRole(minimum)`, the factory to call if a surface ever wants a lower rung. It re-reads the session with `disableCookieCache: true` and also refuses a banned user, so a demotion or ban lands on the next request; never gate on the cached session's role.
- A route the browser calls with a method other than GET or POST needs that method in the `cors()` `allowMethods` list in `index.ts`, and in the OpenAPI `defaultOptions` beside it, or the preflight fails and the request never leaves the page while its 429 and 500 go undocumented. curl will not catch the preflight.
- Reference for a list endpoint: the users list route in `routers/admin.ts` (whitelisted `sort` union with nullable columns coalesced, `LIKE` wildcards escaped, an `asc(user.id)` tiebreaker, `page`/`perPage` batching answered with `pagingFields`, and an explicit NULLS LAST where a sortable column is nullable).

## 2. Wire it

- Export the router from `api/hono/src/routers/index.ts`.
- Mount it with `.route("/<name>", exampleRouter)` in `api/hono/src/index.ts`, inside the `routes` chain before the openapi/docs handlers, or RPC types will not include it.

## 3. Restart the stack and test

`bun --hot` will NOT see a new file, so restart the stack (see the `dev` skill), then:

```bash
WEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)
curl -sS -X POST -H "Content-Type: application/json" -H "Origin: $WEB" \
  -d '{"email":"you@example.com"}' "$API/api/<name>"
```

Done when valid input returns `{ data }`, invalid returns the `VALIDATION_ERROR` envelope, and `/api/docs` lists the route.

## 4. Consume from the web app

```ts
import { apiClient, unwrap } from "@/lib/api/client"
const { data, error } = await unwrap(apiClient.<name>.$post({ json: { ... } }))
```

A client component reading REST data uses TanStack Query (see `components/common/access.tsx`).

## A route that returns a list

Spread `pagingFields` into the response schema and `paging({ page, perPage, total })` into the payload, both from `api/hono/src/lib/paging.ts`, so every list answers the same four fields beside its collection and the end signal is computed once. The collection is named for what it holds (`users`, `events`, `rules`), not `data` or `items`, and comes first, with the paging fields sorted after it: relevance, then A→Z, as AGENTS.md states it.

## A route that acts on a set

When a route acts on rows the caller picked rather than on one resource, use `api/hono/src/lib/batch.ts` rather than inventing a shape:

```ts
import { batchInput, batchResponseSchema, refused, uniqueIds, type BatchOutcome } from "@/lib/batch"

const inputSchema = batchInput({ banned: z.boolean() })   // adds a capped, non-empty ids array
```

- **Ids go in the body, never in the path.** A path parameter names a resource; a set the caller assembled is not one. A single row is a set of one, so there is no second route beside the set route, and no second copy of the guard, transaction and outcome shape to keep in step.
- **Answer 200 with a per-id outcome** (`batchResponseSchema`), never 207: the envelope is uniform, and a `2xx` reads the same to `unwrap` either way. An `{ error }` from a set route still means nothing happened.
- **Refuse per row, throw for the request.** A guard saying no about one target is `refused(id, "FORBIDDEN", message)` pushed onto the results; a bad body or a failed gate is still `throw new ApiError(...)`.
- **One transaction for the set**, and run the ids through `uniqueIds` so a repeat cannot be acted on twice.
- **Guards that count** (the last owner, for example) must count once under the lock and stay in step as the loop writes, since a set can hold several rows the single-row guard would each judge in isolation.

- **Drop the by-id error responses.** A set route has no `notFoundErrorResponses` or `conflictErrorResponses`: those arrive per row inside `{ data }`, so listing them in `responses` would document statuses the route never returns.
- **Record once for the set.** `recordActivity` takes an array, so collect the events in the loop and insert them in one statement after it, rather than one insert per row inside the transaction.

Two rules the routes depend on and a reader will not guess:

- **Write in sorted id order.** The ids are client-supplied, so two admins acting on overlapping selections in opposite orders would deadlock. Answer in the order asked (`answerFor`), write in sorted order.
- **Take a guard's lock whenever the set writes a row it covers**, not only when the guard is about to refuse. The owner lock is the live example: an unban writes owner rows too, and a transaction that writes them without holding the lock can cross orders with one that takes it.

Both helpers are unit-tested from `tests/api/hono/src/lib/`. A test there can import a module that imports `zod`, but cannot import `zod` itself, so pin the parts that do not need it and leave a route's own extra fields to the route.

On the web, `runBatched` in `web/next/src/lib/api/bulk.ts` sends the selection, splitting it at `MAX_BATCH` (from `@packages/config/console`, shared so both sides read one number) and folding each answer with `foldBatch`; `describeBulk` and `toastBulk` work off the resulting counts. See [API Conventions](https://zerostarter.dev/docs/manage/api-conventions) for the contract itself.

## WebSocket routes

For a live server-to-client stream instead of polling, upgrade a `GET` with `upgradeWebSocket` (`api/hono/src/index.ts`). The socket owner differs by host: on Bun (local, Docker) it is `hono/bun` with the shared `websocket` handler next to `fetch` in the `Bun.serve()` export; on Vercel it is the Node adapter (`@hono/node-server` + `ws`) exporting the http server, since Vercel Functions cannot run `Bun.serve()`. That host branching (adapter + server export) lives in `@/lib/server`, picked at boot from `process.env.VERCEL`, so a new WS route just imports `upgradeWebSocket` from there and registers. `/api/health/ws` is the reference: a snapshot on connect, then a heartbeat every 5s.

- The typed client reaches it with `apiClient.health.ws.$ws()`, a standard `WebSocket` pointed at the API base (`http` becomes `ws`).
- Frames are not RPC-typed: `ws.send()` takes a raw string and `$ws()` returns a plain `WebSocket`. Parse defensively and read only the fields you need; do not hand-maintain a shared payload type RPC cannot derive.
- `@/lib/server` casts the Node adapter's `upgradeWebSocket` to the Bun type, so server-side the handler's `ws` (WSContext) is typed as Bun's regardless of host. That is sound for `send`/`close`, but a route reaching into host-specific context (e.g. `ws.raw`) type-checks green yet can diverge at runtime on Vercel. Stick to the common surface (`send`, `close`) or branch per host.
- Keep a `describeRoute` so the upgrade lists in Scalar as a `101`, and describe the frame shape in the route `description`, since OpenAPI cannot schema-type WS frames and there is no `{ data }`/`{ error }` envelope.
- The handshake skips `cors()` (browsers do not apply CORS to WebSockets) and `$ws()` sends no credentials, so gate a sensitive route on the `Origin` header or a token inside the handler, not the allowlist. `/api/health/ws` serves public data, so it does not.
- `bun --hot` picks up edits to an existing `index.ts` route, but restart the stack if the `upgradeWebSocket` is not yet wired into the exported server.

Reference client: `components/marketing/api-status.tsx`. REST `/api/health` is the always-honest baseline, polled whenever no frame is live; the socket overlays a live pulse and reconnects with capped backoff, so a cold start or transient blip (Vercel caps a connection at a few minutes) degrades to the REST-polled state instead of a broken badge.
