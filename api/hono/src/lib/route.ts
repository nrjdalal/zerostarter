import { sValidator } from "@hono/standard-validator"
import type { Context } from "hono"
import { describeRoute, resolver } from "hono-openapi"
import { z, type ZodType } from "zod"

import { authErrorResponses, validationErrorResponses } from "@/lib/error"

// Typed success envelope. The handler still calls c.json (via ok), so Hono's RPC type inference stays anchored on the route and the client keeps seeing { data: T }.
export const ok = <T>(c: Context, data: T) => c.json({ data }, 200)

type RouteSpec = {
  tags: string[]
  description: string
  output: ZodType
  input?: ZodType
  auth?: boolean
}

// One place that builds a route's OpenAPI doc: wraps output in the { data } envelope and documents only the route-specific errors. 429/500 are applied globally by openAPIRouteHandler's defaultOptions; 400 is added when the route validates input, 401 when it is behind auth.
export function defineRoute({ tags, description, output, input, auth }: RouteSpec) {
  return describeRoute({
    tags,
    description,
    responses: {
      200: {
        description: "OK",
        content: { "application/json": { schema: resolver(z.object({ data: output })) } },
      },
      ...(input ? validationErrorResponses : {}),
      ...(auth ? authErrorResponses : {}),
    },
  })
}

// Body validator whose failures throw, so onError shapes every validation 400 in one place. Placed directly in the route chain (not spread) so c.req.valid("json") stays typed.
export const validate = <T extends ZodType>(schema: T) =>
  sValidator("json", schema, (result) => {
    if (!result.success) throw result.error
  })
