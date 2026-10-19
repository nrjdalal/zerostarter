---
name: api-endpoint
description: "Add a typed Hono API endpoint or WebSocket route: router, OpenAPI docs, validation envelope, and RPC client wiring. Use when adding or modifying routes in api/hono."
source: local
---

# API Endpoint

A route the api defines answers in an envelope, `{ data }` or `{ error: { code, message } }`; Better Auth's `/api/auth/*` (all but `/providers`), the `/api/docs` reference and `/api/openapi.json`, the agent sign-in's 302 and WebSocket frames answer in their own formats. Every failure is built by `jsonError` in `api/hono/src/lib/error.ts`: a handler throws `ApiError` and `errorHandler` shapes it, while the auth middleware's 401, the limiter's 429 and the not-found 404 call `jsonError` directly, so a change to `errorHandler` alone misses them. `hono-openapi` documents the envelope and Hono RPC types it end to end. The references are `api/hono/src/routers/waitlist.ts` (public, validated POST) and `routers/v1.ts` (authenticated). A route acting on rows the caller picked follows [A route that acts on a set](#a-route-that-acts-on-a-set); a live stream follows [A WebSocket route](#a-websocket-route).

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

A new public router is exported from `api/hono/src/routers/index.ts` and mounted with `.route("/<name>", exampleRouter)` in `src/index.ts`, inside the `routes` chain, since `AppType` is `typeof routes`; the chain keeps routers above `/openapi.json` by convention. A route added to `v1.ts` or `admin.ts` is already in that chain through `.route("/v1", v1Router)`, so it mounts nothing; a router of its own at `/<name>` would sit outside `authMiddleware`. Done when, for a public router, `rg -n '\.route\("/<name>"' api/hono/src/index.ts` hits once, inside the chain, or, for a `v1.ts` or `admin.ts` route, the file holds it and nothing new is mounted.

## 3. Restart and curl

A new file needs a full restart of the stack (the `dev` skill), then:

```bash
WEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)
curl -sS -X POST -H "Content-Type: application/json" -H "Origin: $WEB" \
  -d '{"email":"you@example.com"}' "$API/api/<name>"
```

A route in `v1.ts` sits at `/api/v1/<name>` behind the auth gate, so sign in first (the `dev` skill's Agent login) and add `-b cookies.txt`: without a session every path there answers 401 `UNAUTHORIZED`, and below admin every path under `/api/v1/admin` answers 403 `FORBIDDEN`, before the route runs. Done when valid input returns `{ data }`, invalid returns the `VALIDATION_ERROR` envelope, and `/api/openapi.json` names the path (the document is served while `apiDocs` in `packages/config/src/site.ts` is on).

## 4. Call it from the web app

```ts
import { apiClient, unwrap } from "@/lib/api/client"
const { data, error } = await unwrap(apiClient.<name>.$post({ json: { ... } }))
```

The client follows the mount: `apiClient.<name>` for a public router, `apiClient.v1.<name>` for a `v1.ts` route and `apiClient.v1.admin.<name>` for a console one. `unwrap` never throws: exactly one of `data` and `error` is non-null, with `NETWORK_ERROR` and `UNKNOWN_ERROR` covering the transport. The API's types reach the web app through `@api/hono`'s built `dist`, which turbo's `check-types` builds first (`^build`), so a stale type means a stale build. A client component reads through TanStack Query as `components/common/access.tsx` does: the `queryFn` unwraps the call and throws on `error`. Done when `bunx turbo run check-types --filter=@web/next` exits 0, after a deliberately wrong key in the call failed it first.

## Response shape

Where one key is what the response is about and the rest describe it, that key leads and the others sort A→Z after it (`users`, then `hasNextPage`, `page`, `perPage`, `total`); everything else, a row's own fields included, is plain A→Z with `id` in its alphabetical place. A list spreads `pagingFields` into its schema and `paging({ page, perPage, total })` into its payload, both from `api/hono/src/lib/paging.ts`, and names the collection for what it holds (`users`, `events`, `rules`). The users list in `routers/admin.ts` is the sort reference: a `sort` enum feeding a column map, `escapeLike` on the search, `nulls last` on a nullable column, and `asc(user.id)` as the tiebreaker.

## A route that acts on a set

`api/hono/src/lib/batch.ts` holds the shape. **Ids go in the body**, never in the path: `batchInput({ ...fields })` adds a capped, non-empty `ids` array, and a single row is a set of one, so one route serves both. **Answer 200 with `batchResponseSchema`**, never 207: a per-id outcome inside `{ data }`, since 207 reads as 2xx to `unwrap` and `{ error }` keeps meaning nothing happened. One transaction for the set, `uniqueIds` on the input, writes in sorted id order, and `answerFor` to answer in the order asked. A guard that counts (the last owner) counts once under a `for("update")` lock taken whenever the set writes a row the guard covers, and stays in step as the loop writes. Refuse per row with `refused(id, code, message)` or `raced(id)`; throw `ApiError` for the request. `responses` carries validation, auth and forbidden, while 404 and 409 arrive per row. `recordActivity(tx, records)` (`packages/db/src/console.ts`) once after the loop. On the web, `runBatched` in `web/next/src/lib/api/bulk.ts` splits a selection at `MAX_BATCH` (`@packages/config/console`) and folds the answers for `toastBulk`. Done when a set of one and a set of many both answer 200 with one outcome per id, in the order asked.

## A WebSocket route

Upgrade a `GET` with `upgradeWebSocket` from `@/lib/server`, which picks the Bun or Node adapter per host and casts the Node one to Bun's handler type; `/api/health/ws` in `src/index.ts` is the reference. Keep `describeRoute` with a `101` response and the frame shape in `description`, since frames carry no envelope and OpenAPI cannot type them. The client reaches it with `apiClient.<name>.ws.$ws()`, a plain `WebSocket` with `http` swapped for `ws`; parse each frame defensively and read only the fields needed. The `cors()` allowlist does not gate the handshake, so a socket that needs a signed-in user authenticates the upgrade with a token checked inside the handler, typically a short-lived single-use ticket the client fetches from an authenticated REST route. An `Origin` check can sit beside the token, since it keeps other sites' pages from opening the socket in a visitor's browser, but a client outside a browser sends any `Origin` it likes, so it authenticates no one. Inside the handler, `send` and `close` are the surface that behaves the same on both hosts. Done when the socket delivers a frame in the browser and the route lists as `101` in `/api/openapi.json`. The reference client in the canonical starter is `components/marketing/api-status.tsx`.
