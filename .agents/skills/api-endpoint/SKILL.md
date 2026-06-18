---
name: api-endpoint
description: Add a typed Hono API endpoint following repo conventions, router, OpenAPI docs, validation envelope, RPC client wiring. Use when adding or modifying API routes in api/hono.
---

# API Endpoint

Reference implementation: `api/hono/src/routers/v1.ts` (validated, OpenAPI-documented routes). Conventions: `{ data }` / `{ error: { code, message } }` envelopes, OpenAPI via `hono-openapi`, end-to-end types via Hono RPC.

## Workflow

### 1. Create the router

`api/hono/src/routers/<name>.ts`:

```ts
import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

import { validationHook } from "@/lib/validation"

const bodySchema = z.object({
  // z.string().trim().pipe(...) for user-supplied strings
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
    },
  }),
  sValidator("json", bodySchema, validationHook),
  async (c) => {
    const body = c.req.valid("json")
    return c.json({ data: { message: "ok" } })
  },
)
```

- **Always** pass `validationHook` to `sValidator`, it produces the repo's `VALIDATION_ERROR` envelope
- Add an `x-codeSamples` block mirroring the existing routers so Scalar shows the RPC usage
- Auth-protected routes go in `v1.ts` (behind `authMiddleware`, session/user on context); public routes get their own router

### 2. Wire it

- Export from `api/hono/src/routers/index.ts`
- `.route("/<name>", exampleRouter)` in `api/hono/src/index.ts`, inside the `routes` chain (before the openapi/docs handlers), or RPC types will not include it

### 3. Restart dev and test

`bun --hot` will NOT see the new file, restart the stack (see the `dev` skill), then:

```bash
curl -sS -X POST -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -d '{"field":"value"}' http://localhost:4000/api/<name>
# verify: valid input → {data}, invalid → VALIDATION_ERROR envelope, and /api/docs lists it
```

### 4. Consume from the web app

```ts
import { apiClient } from "@/lib/api/client"
const res = await apiClient.<name>.$post({ json: { ... } })   // fully typed
```

Client components needing live data use TanStack Query (see `api-status.tsx`).
