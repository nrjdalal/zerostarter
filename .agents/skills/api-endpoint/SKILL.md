---
name: api-endpoint
description: Add a typed Hono API endpoint following repo conventions: router, OpenAPI docs, validation envelope, and RPC client wiring. Use when adding or modifying API routes in api/hono.
---

# API Endpoint

Reference implementations: `api/hono/src/routers/waitlist.ts` (public, body-validated POST) and `api/hono/src/routers/v1.ts` (auth-gated routes). Conventions: `{ data }` success / `{ error: { code, message } }` failure envelopes, OpenAPI via `hono-openapi`, end-to-end types via Hono RPC. Errors are thrown as `ApiError` and shaped in one place by `app.onError` (`api/hono/src/lib/error.ts`).

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

- The `sValidator` hook **throws `ApiError(400, "VALIDATION_ERROR", …)`**; there is no shared `validationHook` import. `onError` turns it into the repo's `{ error: { code, message } }` envelope.
- Spread `...validationErrorResponses` into `responses` so the 400 shape shows in the OpenAPI/Scalar docs.
- Add an `x-codeSamples` block mirroring `waitlist.ts` so Scalar shows the `hono/client` usage.
- Auth-protected routes go in `v1.ts` (behind `authMiddleware` from `@/middlewares`, with `Variables: Session` so `c.get("session")`/`c.get("user")` are typed); public routes get their own router.

### 2. Wire it

- Export from `api/hono/src/routers/index.ts`
- `.route("/<name>", exampleRouter)` in `api/hono/src/index.ts`, inside the `routes` chain (before the openapi/docs handlers), or RPC types will not include it

### 3. Restart dev and test

`bun --hot` will NOT see the new file, restart the stack (see the `dev` skill), then:

```bash
curl -sS -X POST -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -d '{"email":"you@example.com"}' http://localhost:4000/api/<name>
# verify: valid input → {data}, invalid → VALIDATION_ERROR envelope, and /api/docs lists it
```

### 4. Consume from the web app

```ts
import { apiClient, unwrap } from "@/lib/api/client"
const { data, error } = await unwrap(apiClient.<name>.$post({ json: { ... } }))   // fully typed
```

Client components reading REST data use TanStack Query (see `components/access.tsx`).

## WebSocket routes

For a live server-to-client stream instead of polling, upgrade a `GET` with `upgradeWebSocket` from `hono/bun` and add the shared `websocket` handler to the Bun server export next to `fetch` (`api/hono/src/index.ts`). `/api/health/ws` is the reference: it pushes a snapshot on connect and a heartbeat every 5s.

- The typed client reaches it with `apiClient.health.ws.$ws()`, which returns a standard `WebSocket` pointed at the configured API base (`http` becomes `ws`).
- Frame payloads are not RPC-typed: `ws.send()` takes a raw string and `$ws()` returns a plain `WebSocket`, so parse defensively on the client and read only the fields you need. Don't hand-maintain a shared payload type RPC can't derive.
- Keep a `describeRoute` so the upgrade lists in the Scalar reference as a `101`, but OpenAPI can't schema-type WS frames and there is no `{ data }` / `{ error }` envelope: describe the frame shape in the route's `description`.
- Unlike REST, the handshake is not gated by `cors()` (browsers don't apply CORS to WebSockets) and `$ws()` does not send the client's credentials, so for a sensitive or authed route check the `Origin` header (or a token) in the handler rather than relying on the allowlist. `/api/health/ws` serves public data, so it doesn't.
- `bun --hot` picks up edits to the existing `index.ts` route, but restart the stack if `hono/bun` isn't yet wired into the Bun export.

See `components/marketing/api-status.tsx` for the reference client: REST `/api/health` is the always-honest baseline (polled whenever no frame is live), and the socket overlays a live pulse, reconnecting with capped backoff so a serverless deploy or a transient blip degrades to the REST-polled state instead of a broken badge.
