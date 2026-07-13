import { describeRoute, resolver, validator } from "hono-openapi"
import { z } from "zod"

import {
  ApiError,
  authErrorResponses,
  globalErrorResponses,
  validationErrorResponses,
} from "@/lib/error"

type JsonRouteSpec = {
  tags: string[]
  description: string
  // The hono/client call expression shown in the Scalar sample, e.g. `apiClient.waitlist.$get()`; wrapped in the import + unwrap scaffold.
  sample: string
  // The success payload schema, wrapped in the { data } envelope for the 200 response.
  output: z.ZodType
  // Route has a jsonBody validator: documents the 400 VALIDATION_ERROR response (the request body itself is documented by the validator).
  validated?: boolean
  // Route is behind authMiddleware: documents the 401 UNAUTHORIZED response.
  auth?: boolean
}

// The describeRoute doc middleware for a { data }-envelope JSON route. Generates the 200 response schema from a Zod validator, expands the hono/client sample from one call expression, and lists only the error responses that apply: 429/500 are always reachable (global rate limiter + onError), 400/401 are opt-in. Non-JSON routes (e.g. the WebSocket upgrade) keep using describeRoute directly.
export function jsonRoute(spec: JsonRouteSpec) {
  return describeRoute({
    tags: spec.tags,
    description: spec.description,
    ...({
      "x-codeSamples": [
        {
          lang: "typescript",
          label: "hono/client",
          source: `import { apiClient, unwrap } from "@/lib/api/client"

const { data, error } = await unwrap(${spec.sample})`,
        },
      ],
    } as object),
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: resolver(z.object({ data: spec.output })),
          },
        },
      },
      ...globalErrorResponses,
      ...(spec.validated ? validationErrorResponses : {}),
      ...(spec.auth ? authErrorResponses : {}),
    },
  })
}

// Validate a JSON request body against a Zod schema. hono-openapi's validator documents the requestBody from the same schema it checks at runtime, so the OpenAPI spec and the validator cannot drift. A failure throws ApiError so onError shapes the 400 VALIDATION_ERROR envelope in one place.
export function jsonBody<T extends z.ZodType>(schema: T, message: string) {
  return validator("json", schema, (result) => {
    if (!result.success) {
      throw new ApiError(400, "VALIDATION_ERROR", message, { issues: result.error })
    }
  })
}
