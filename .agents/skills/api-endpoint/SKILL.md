---
name: api-endpoint
description: Add a typed Hono API endpoint following repo conventions, router, OpenAPI docs, validation envelope, RPC client wiring. Use when adding or modifying API routes in api/hono.
---

# API Endpoint

Reference: `api/hono/src/routers/v1.ts` (OpenAPI-documented, auth-protected GET routes with `{ data }` envelopes and `x-codeSamples`). No input-validated route exists in the repo yet, so the validation snippet below establishes that pattern. Conventions: `{ data }` / `{ error: { code, message } }` envelopes, OpenAPI via `hono-openapi`, end-to-end types via Hono RPC.

## Workflow

### 1. Create the router

`api/hono/src/routers/<name>.ts`:

```ts
import { sValidator } from "@hono/standard-validator"
import { Hono } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z } from "zod"

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
  sValidator("json", bodySchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request payload", issues: result.error } },
        400,
      )
    }
  }),
  async (c) => {
    const body = c.req.valid("json")
    return c.json({ data: { message: "ok" } })
  },
)
```

- **Always** pass a failure hook to `sValidator` that returns the repo's `VALIDATION_ERROR` envelope (it mirrors the global `errorHandler` in `api/hono/src/lib/error.ts`, which only formats *thrown* `z.ZodError`s). Without a hook, `sValidator` returns its own `{ success: false, error }` 400 shape, which does NOT match the repo envelope. Extract the hook to `@/lib/validation` once more than one route needs it
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
