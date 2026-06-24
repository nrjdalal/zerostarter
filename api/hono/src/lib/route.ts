import { sValidator } from "@hono/standard-validator"
import { describeRoute, resolver } from "hono-openapi"
import { z, type ZodType } from "zod"

import { authErrorResponses, validationErrorResponses } from "@/lib/error"

type RouteSpec = {
  description: string
  output: ZodType
  input?: ZodType
  auth?: boolean
}

// A router's routes share a tag (and often auth). routeGroup binds those once and returns a per-route definer that builds the OpenAPI doc: output wrapped in the { data } envelope, plus only the route-specific errors (400 when it validates input, 401 when behind auth). 429/500 are applied globally by openAPIRouteHandler's defaultOptions.
export const routeGroup =
  (group: { tags: string[]; auth?: boolean }) =>
  ({ description, output, input, auth }: RouteSpec) =>
    describeRoute({
      tags: group.tags,
      description,
      responses: {
        200: {
          description: "OK",
          content: { "application/json": { schema: resolver(z.object({ data: output })) } },
        },
        ...(input ? validationErrorResponses : {}),
        ...((auth ?? group.auth) ? authErrorResponses : {}),
      },
    })

// Body validator whose failures throw, so onError shapes every validation 400 in one place. Placed directly in the route chain (not spread) so c.req.valid("json") stays typed.
export const validate = <T extends ZodType>(schema: T) =>
  sValidator("json", schema, (result) => {
    if (!result.success) throw result.error
  })
