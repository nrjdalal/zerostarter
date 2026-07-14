---
name: api-endpoint
description: Add a typed Hono API endpoint or WebSocket route: router, OpenAPI docs, validation envelope, and RPC client wiring. Use when adding or modifying routes in api/hono.
---

# API Endpoint

Every response is an envelope: `{ data }` on success, `{ error: { code, message } }` on failure. Never build the failure envelope by hand: throw `ApiError` and `errorHandler` (`api/hono/src/lib/error.ts`) shapes it in ONE place. OpenAPI comes from `hono-openapi`; end-to-end types from Hono RPC. Reference routers: `api/hono/src/routers/waitlist.ts` (public, body-validated POST) and `api/hono/src/routers/v1.ts` (auth-gated).

## Workflow

### 1. Create the router

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

- Spread the matching error-response set into `responses` so its shape shows in the Scalar docs: `...validationErrorResponses` (400) for a validated route, `...authErrorResponses` (401) for an auth route. 429/500 are added globally in `index.ts`; don't add them per route.
- Add an `x-codeSamples` block mirroring `waitlist.ts` so Scalar shows the `hono/client` usage (the template above omits it).
- Auth-protected routes go in `v1.ts`, behind `authMiddleware` from `@/middlewares` with `Variables: Session` so `c.get("session")`/`c.get("user")` are typed. Public routes get their own router.

### 2. Wire it

- Export the router from `api/hono/src/routers/index.ts`.
- Add `.route("/<name>", exampleRouter)` in `api/hono/src/index.ts`, inside the `routes` chain before the openapi/docs handlers, or RPC types won't include it.

### 3. Restart the stack and test

`bun --hot` will NOT see a new file: restart the stack (see the `dev` skill), then:

```bash
WEB=$(bunx portless get zerostarter); API=$(bunx portless get api.zerostarter)
curl -sS -X POST -H "Content-Type: application/json" -H "Origin: $WEB" \
  -d '{"email":"you@example.com"}' "$API/api/<name>"
```

Done when valid input returns `{ data }`, invalid returns the `VALIDATION_ERROR` envelope, and `/api/docs` lists the route.

### 4. Consume from the web app

```ts
import { apiClient, unwrap } from "@/lib/api/client"
const { data, error } = await unwrap(apiClient.<name>.$post({ json: { ... } }))
```

Client components reading REST data use TanStack Query (see `components/common/access.tsx`).

## WebSocket routes

For a live server-to-client stream instead of polling, upgrade a `GET` with `upgradeWebSocket` (`api/hono/src/index.ts`). The socket owner differs by host: on Bun (local, Docker) it's `hono/bun` with the shared `websocket` handler next to `fetch` in the `Bun.serve()` export; on Vercel it's the Node adapter (`@hono/node-server` + `ws`) exporting the http server, since Vercel Functions can't run `Bun.serve()`. That host branching (adapter + server export) lives in `@/lib/server`, picked at boot from `process.env.VERCEL`, so a new WS route just imports `upgradeWebSocket` from there and registers. `/api/health/ws` is the reference: a snapshot on connect, then a heartbeat every 5s.

- The typed client reaches it with `apiClient.health.ws.$ws()`, a standard `WebSocket` pointed at the API base (`http` becomes `ws`).
- Frames are not RPC-typed: `ws.send()` takes a raw string and `$ws()` returns a plain `WebSocket`. Parse defensively and read only the fields you need; don't hand-maintain a shared payload type RPC can't derive.
- `@/lib/server` casts the Node adapter's `upgradeWebSocket` to the Bun type, so on the server side the handler's `ws` (WSContext) is typed as Bun's regardless of host. That is sound for `send`/`close`, but a route reaching into host-specific context (e.g. `ws.raw`) type-checks green yet can diverge at runtime on Vercel. Stick to the common surface (`send`, `close`) or branch per host.
- Keep a `describeRoute` so the upgrade lists in Scalar as a `101`, and describe the frame shape in the route `description`, since OpenAPI can't schema-type WS frames and there is no `{ data }`/`{ error }` envelope.
- The handshake skips `cors()` (browsers don't apply CORS to WebSockets) and `$ws()` sends no credentials, so gate a sensitive route on the `Origin` header or a token inside the handler, not the allowlist. `/api/health/ws` serves public data, so it doesn't.
- `bun --hot` picks up edits to an existing `index.ts` route, but restart the stack if the `upgradeWebSocket` isn't yet wired into the exported server.

Reference client: `components/marketing/api-status.tsx`. REST `/api/health` is the always-honest baseline, polled whenever no frame is live; the socket overlays a live pulse and reconnects with capped backoff, so a cold start or transient blip (Vercel caps a connection at a few minutes) degrades to the REST-polled state instead of a broken badge.
