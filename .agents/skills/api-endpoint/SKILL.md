---
name: api-endpoint
description: "Add a typed Hono API endpoint or WebSocket route: router, OpenAPI docs, validation envelope, and RPC client wiring. Use when adding or modifying routes in api/hono."
source: local
---

# API Endpoint

Every response is an envelope, `{ data }` or `{ error: { code, message } }`, the failure thrown as `ApiError` and shaped by `errorHandler` in `api/hono/src/lib/error.ts`; `hono-openapi` documents it and Hono RPC types it end to end. The references are `api/hono/src/routers/waitlist.ts` (public, validated POST) and `routers/v1.ts` (authenticated). A route acting on rows the caller picked follows [A route that acts on a set](#a-route-that-acts-on-a-set); a live stream follows [A WebSocket route](#a-websocket-route).

## 1. Write the router

A public route gets its own `api/hono/src/routers/<name>.ts`. An authenticated route joins `v1.ts`, typed `Hono<{ Variables: Session }>` behind `authMiddleware` so `c.get("user")` is typed. A console route joins `routers/admin.ts`, mounted at `/admin` inside `v1.ts` under `consoleAdminMiddleware`, which re-reads the session uncached and refuses a banned user, so a demotion or ban lands on the next request.

```ts
import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { ApiError, validationErrorResponses } from "@/lib/error"

const bodySchema = z.object({
  email: z.string().trim().pipe(z.email().max(254)),
})

export const exampleRouter = new Hono().post(
  "/",
  describeRoute({
    tags: ["Example"],
    description: "...",
    // x-codeSamples, mirrored from waitlist.ts, shows the hono/client call in the API reference
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: resolver(z.object({ data: z.object({ email: z.string() }) })),
          },
        },
      },
      ...validationErrorResponses,
    },
  }),
  sValidator("json", bodySchema, (result) => {
    if (!result.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid input", { issues: result.error })
    }
  }),
  async (c) => {
    const { email } = c.req.valid("json")
    return c.json({ data: { email } })
  },
)
```

`responses` spreads one set per middleware the route sits behind: `validationErrorResponses` for a validator, `authErrorResponses` behind `authMiddleware`, `forbiddenErrorResponses` behind the console gate, plus `notFoundErrorResponses` for a row addressed by id and `conflictErrorResponses` for a unique constraint it can lose to. 429 and 500 come from `src/index.ts` for every method. A method missing from `cors()`'s `allowMethods` and the OpenAPI `defaultOptions` beside it joins both lists, or the browser's preflight fails (curl sends none) and the route's 429 and 500 go undocumented. Done when `bunx turbo run check-types --filter=@api/hono` exits 0 and `responses` holds 200 plus one spread per middleware the route sits behind.

## 2. Wire it

Export the router from `api/hono/src/routers/index.ts` and mount it with `.route("/<name>", exampleRouter)` in `src/index.ts`, in the `routes` chain above `/openapi.json`, since `AppType` is `typeof routes`. Done when `rg -n '\.route\("/<name>"' api/hono/src/index.ts` hits once above it.

## 3. Restart and curl

A new file needs a full restart of the stack (the `dev` skill), then:

```bash
WEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)
curl -sS -X POST -H "Content-Type: application/json" -H "Origin: $WEB" \
  -d '{"email":"you@example.com"}' "$API/api/<name>"
```

Done when valid input returns `{ data }`, invalid returns the `VALIDATION_ERROR` envelope, and `/api/openapi.json` names the path (the document is served while `apiDocs` in `packages/config/src/site.ts` is on).

## 4. Call it from the web app

```ts
import { apiClient, unwrap } from "@/lib/api/client"
const { data, error } = await unwrap(apiClient.<name>.$post({ json: { ... } }))
```

`unwrap` never throws: exactly one of `data` and `error` is non-null, with `NETWORK_ERROR` and `UNKNOWN_ERROR` covering the transport. The API's types reach the web app through `@api/hono`'s built `dist`, which turbo's `check-types` builds first (`^build`), so a stale type means a stale build. A client component reads through TanStack Query as `components/common/access.tsx` does: the `queryFn` unwraps the call and throws on `error`. Done when `bunx turbo run check-types --filter=@web/next` exits 0, after a deliberately wrong key in the call failed it first.

## Response shape

Where one key is what the response is about and the rest describe it, that key leads and the others sort A→Z after it (`users`, then `hasNextPage`, `page`, `perPage`, `total`); everything else, a row's own fields included, is plain A→Z with `id` in its alphabetical place. A list spreads `pagingFields` into its schema and `paging({ page, perPage, total })` into its payload, both from `api/hono/src/lib/paging.ts`, and names the collection for what it holds (`users`, `events`, `rules`). The users list in `routers/admin.ts` is the sort reference: a `sort` enum feeding a column map, `escapeLike` on the search, `nulls last` on a nullable column, and `asc(user.id)` as the tiebreaker.

## A route that acts on a set

`api/hono/src/lib/batch.ts` holds the shape. **Ids go in the body**, never in the path: `batchInput({ ...fields })` adds a capped, non-empty `ids` array, and a single row is a set of one, so one route serves both. **Answer 200 with `batchResponseSchema`**, never 207: a per-id outcome inside `{ data }`, since 207 reads as 2xx to `unwrap` and `{ error }` keeps meaning nothing happened. One transaction for the set, `uniqueIds` on the input, writes in sorted id order, and `answerFor` to answer in the order asked. A guard that counts (the last owner) counts once under a `for("update")` lock taken whenever the set writes a row the guard covers, and stays in step as the loop writes. Refuse per row with `refused(id, code, message)` or `raced(id)`; throw `ApiError` for the request. `responses` carries validation, auth and forbidden, while 404 and 409 arrive per row. `recordActivity(tx, records)` (`packages/db/src/console.ts`) once after the loop. On the web, `runBatched` in `web/next/src/lib/api/bulk.ts` splits a selection at `MAX_BATCH` (`@packages/config/console`) and folds the answers for `toastBulk`.

## A WebSocket route

Upgrade a `GET` with `upgradeWebSocket` from `@/lib/server`, which picks the Bun or Node adapter per host and casts both to Bun's handler type; `/api/health/ws` in `src/index.ts` is the reference. Keep `describeRoute` with a `101` response and the frame shape in `description`, since frames carry no envelope and OpenAPI cannot type them. The client reaches it with `apiClient.<name>.ws.$ws()`, a plain `WebSocket` with `http` swapped for `ws`; parse each frame defensively and read only the fields needed. The `cors()` allowlist does not gate the handshake, so a sensitive socket checks the `Origin` header or a token inside the handler. Inside the handler, `send` and `close` are the surface that behaves the same on both hosts. Done when the socket delivers a frame in the browser and the route lists as `101` in `/api/openapi.json`. The reference client in the canonical starter is `components/marketing/api-status.tsx`.
