# API `{ data } | { error }` Response Shape — Design & Implementation Plan

Date: 2026-06-22
Branch: `refactor/api-result-convention` (off `canary`)
Status: design approved in principle; ready to execute.

## 1. Goal

Every API response is a discriminated union — **`{ data: T }` on success, `{ error: { code, message } }` on failure** — that is:

1. **Owned by the server** (the server declares the shape once; the client never hand-writes it).
2. **Typed end to end** (the typed client knows both arms of the union for every route).
3. **Documented** (the OpenAPI / Scalar reference advertises the error responses, not just `200`).
4. **Consumed cleanly** on the frontend as `{ data, error }` via React Query, with **no `parseResponse`, no hand-rolled `unwrap`/`result` helper**.

A whole-codebase refactor of the client consumption sites is acceptable; the result should be one consistent convention.

## 2. Where we are today (canary)

The runtime envelope already exists and is correct:

- `api/hono/src/lib/error.ts` — `jsonError(c, status, code, message, extra?)` returns `c.json({ error: { code, message, ...extra } }, status)`; `errorHandler` maps `ZodError → 400 VALIDATION_ERROR` and anything else → `500 INTERNAL_SERVER_ERROR`.
- `api/hono/src/index.ts` — `app.onError(errorHandler)`, `app.notFound(... jsonError ...)`, success handlers return `c.json({ data })`.
- Documented in `web/next/content/docs/manage/api-conventions.mdx`.

**The gap is not runtime, it is the type and the docs:**

- The typed client (`hc<AppType>`) only knows each route's **declared `200`** body. The error envelope is produced by the _global_ `onError` / `notFound` / validator hooks, which are **not part of `AppType`**, so `res.json()` is typed as success-only and the client cannot see/narrow the error.
- The OpenAPI document is generated from each route's `describeRoute({ responses })`, which only declares `200`. So the Scalar docs at `/api/docs` **do not show any error responses** — the user's concrete complaint: "I only get the responses I give."

## 3. The core constraint (why this needed exploration)

Three things collide:

- **`fetch` / `hc` resolve on HTTP 4xx/5xx.** A non-2xx is a _successful_ promise with `res.ok === false`; fetch only rejects on a network-level failure.
- **React Query (`useQuery`/`useMutation`) flips to `error` only when the fn throws.** It never inspects HTTP status.
- Therefore a non-2xx must be converted, **on the client**, into either a thrown error or a discriminated-union read. The server cannot make the client throw — that is inherently a client concern.

This is why "just let the server own it" does not, by itself, remove a small amount of client glue: the glue is the fetch ↔ React-Query bridge, not a server deficiency.

## 4. Options considered

| #   | Option                                                                  | Verdict                                                                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hand-rolled `unwrap`/`result` helper returning `{ data, error }`        | Rejected — reinvents response parsing; the team found it unsatisfying ("sad").                                                                                                                                                                |
| 2   | Hono built-in `parseResponse` + `DetailedError`                         | Works and is official, but **throw-based** and buries the structured envelope in `DetailedError.detail.data` (typed `any`). Not the `{ data, error }` shape; awkward for surfacing the server's message. Rejected as the consumption surface. |
| 3   | `neverthrow` `Result<Ok, Err>`                                          | Adds a dependency + FP ceremony; fights React Query's throw model. Rejected.                                                                                                                                                                  |
| 4   | `better-fetch` / `ofetch` / `ky`                                        | Do not compose with `hc`'s typed `ClientResponse` (Hono [#4560]). Rejected.                                                                                                                                                                   |
| 5   | Switch to **oRPC / tRPC** (native safe `{ data, error }` client)        | A framework migration; zerostarter is built on Hono RPC. Rejected.                                                                                                                                                                            |
| 6   | Server always returns **HTTP 200** with `{ data, error }` body          | Breaks HTTP semantics, the OpenAPI docs, caching, monitoring, the `429`/rate-limit story — and React Query _still_ needs a throw. Anti-pattern. Rejected.                                                                                     |
| 7   | Re-export `parseResponse` / auto-parsing client                         | Auto-parse needs a recursive re-typing of the whole `hc` client and fights the fetch coupling (Hono [#3894]/[#4560]). Not worth it. Rejected.                                                                                                 |
| 8   | \*\*Server declares the envelope once; client reads the typed `{ data } | { error }`union via React Query with plain`res.json()`+`if ("error" in body)`\*\*                                                                                                                                                             | **Chosen.** No helper, no `parseResponse`. Matches Hono's own React (SWR) example, whose fetcher is a plain `res.json()`. |

## 5. Final design

**One source of truth → three layers, all derived from it.**

```
errorEnvelope (zod schema, api/hono/src/lib/error.ts)
   ├─ runtime  →  jsonError / errorHandler already emit this shape   (unchanged)
   ├─ types    →  AppType = ApplyGlobalResponse<routes, { 4xx/5xx: errorEnvelope }>
   └─ docs     →  openAPIRouteHandler defaultOptions = errorResponses(errorEnvelope)
```

- `jsonError` / `errorHandler` are **kept as-is** — they are the runtime producer and are correct.
- `ApplyGlobalResponse` (a `hono/client` type helper) merges the error responses into every route's type, so `res.json()` is `{ data } | { error }`.
- `defaultOptions` (a `hono-openapi` `openAPIRouteHandler` option, keyed by HTTP method, merged into each route's `responses`) makes the Scalar docs list the error responses.
- The client reads the union and narrows with `if ("error" in body)`. React Query provides the `{ data, error, isPending/isError }` surface.

This was prototyped end-to-end during design and **type-checked clean (`api/hono` + `web/next`, 7/7 tasks)**, and the generated OpenAPI spec was verified to list `200, 400, 401, 403, 404, 429, 500` on every route.

## 6. Implementation plan (file by file)

### Server

**`api/hono/src/lib/error.ts`** — add one schema next to `jsonError` (runtime untouched):

```ts
import { z } from "zod"

export const errorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})
```

**`api/hono/src/index.ts`** — derive types + docs from that schema:

```ts
import type { ApplyGlobalResponse } from "hono/client"
import { errorEnvelope, errorHandler, jsonError } from "@/lib/error"

const errorResponses = Object.fromEntries(
  [400, 401, 403, 404, 429, 500].map((s) => [
    s,
    { description: "Error", content: { "application/json": { schema: resolver(errorEnvelope) } } },
  ]),
)

// ...openAPIRouteHandler(app, {
//   documentation: { ... },
//   defaultOptions: { GET: { responses: errorResponses }, POST: { responses: errorResponses } },
// })

export type AppType = ApplyGlobalResponse<
  typeof routes,
  Record<400 | 401 | 403 | 404 | 429 | 500, { json: z.infer<typeof errorEnvelope> }>
>
```

### Client — the one canonical pattern

Read the union, narrow with `if ("error" in body)`. No `parseResponse`, no helper.

```ts
// read that should surface failure (api-status health, auth providers): throw → React Query isError
const res = await apiClient.health.$get()
const body = await res.json()
if ("error" in body) throw new Error("Systems are facing issues")
return body.data

// soft read (waitlist count): swallow → hide the badge
const res = await apiClient.waitlist.$get()
const body = await res.json()
if ("error" in body) return null
return body.data.count

// mutation (waitlist submit): useMutation; discriminate in onSuccess; isPending drives the button
const joinWaitlist = useMutation({
  mutationFn: async (value: { email: string; subject: string }) => {
    const res = await apiClient.waitlist.$post({ json: value })
    return res.json()
  },
  onSuccess: (body) => {
    if ("error" in body) {
      toast.error(body.error.message)
      return
    }
    setJoined(true)
    toast.success("You're on the waitlist!")
    queryClient.invalidateQueries({ queryKey: ["waitlist-count"] })
  },
})
```

Call sites to convert (all current Hono RPC consumers):

- `web/next/src/components/api-status.tsx` — health GET (throw on error).
- `web/next/src/components/access.tsx` — auth providers GET (throw on error).
- `web/next/src/app/waitlist/page.tsx` — count GET (return null on error) + submit (`useMutation`, drops the manual `loading` state).

**Out of scope:** the Better Auth calls (`authClient.signIn.magicLink` / `.social`, `authClient.organization.create`) are a _different_ client that already returns `{ data, error }` natively. They are left as-is.

### Docs (keep the convention self-documenting)

Update to the `res.json()` + `if ("error" in body)` pattern and note that the server declares the envelope via `ApplyGlobalResponse`:

- `web/next/content/docs/getting-started/type-safe-api.mdx`
- `web/next/content/docs/manage/api-conventions.mdx`
- `README.md` and the homepage code sample in `web/next/src/app/page.tsx`
- OpenAPI `x-codeSamples` in `api/hono/src/index.ts`, `routers/waitlist.ts`, `routers/v1.ts`

## 7. Verification

- `bunx turbo run check-types --filter=@api/hono --filter=@web/next` → clean.
- `bun run lint` + `bunx oxfmt` on the touched files → clean.
- Generate the OpenAPI spec and confirm error codes appear on representative routes (done in design via in-process `app.fetch("/api/openapi.json")`).
- Browser smoke on the running stack: waitlist submit (success + forced error), the API-status badge, and the Scalar docs at `/api/docs` showing the error responses.

## 8. Rollout

- One coherent commit on `refactor/api-result-convention`; PR into `canary`.
- This branch and PR #533 (TanStack Form parity) both touch `web/next/src/app/waitlist/page.tsx`; expect a small merge reconciliation on whichever lands second.

## 9. Notes / non-goals

- `jsonError`'s optional `extra` (e.g. validation `issues`) is route-specific and intentionally not part of the global `errorEnvelope` type.
- The 1-line `if ("error" in body)` per call site is the irreducible fetch ↔ React-Query bridge; it is not removable without an anti-pattern (always-200) or a framework swap (oRPC/tRPC).

## Appendix — sources

- Hono RPC guide: <https://hono.dev/docs/guides/rpc> (`parseResponse`, `DetailedError`, `ApplyGlobalResponse`, `InferResponseType`; the only React example is SWR with a plain `res.json()` fetcher)
- Hono RFC: type helpers for typed RPC error handling — <https://github.com/honojs/hono/issues/4270>
- Hono issue: RPC client response parsing option — <https://github.com/honojs/hono/issues/3894>
- Hono issue: `ClientResponse` coupled to native fetch (why ofetch/ky/better-fetch do not compose) — <https://github.com/honojs/hono/issues/4560>
- Verified locally against `hono@4.12.26` and `hono-openapi@1.3.0`.
