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

Client components needing live data use TanStack Query (see `components/marketing/api-status.tsx`).
