import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import type { Context } from "hono"
import { resolver, type ResponsesWithResolver } from "hono-openapi"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { z } from "zod"

export function jsonError<S extends ContentfulStatusCode>(
  c: Context,
  status: S,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  return c.json({ error: { code, message, ...extra } }, status)
}

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof z.ZodError) {
    return jsonError(c, 400, "VALIDATION_ERROR", "Invalid request payload", { issues: err.issues })
  }

  const message = isLocal(env.NODE_ENV) ? err.message : "Internal Server Error"
  return jsonError(c, 500, "INTERNAL_SERVER_ERROR", message)
}

// Shape of the error envelope jsonError emits; reused by the OpenAPI error responses below.
export const errorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})

// One OpenAPI error response, with its own code/message example.
const errorResponse = (code: string, message: string) => ({
  description: message,
  content: {
    "application/json": {
      schema: resolver(errorEnvelope),
      example: { error: { code, message } },
    },
  },
})

// 429 + 500 can hit any matched route (global rate limiter + onError), so they apply everywhere.
export const globalErrorResponses: ResponsesWithResolver = {
  429: errorResponse("TOO_MANY_REQUESTS", "Too Many Requests"),
  500: errorResponse("INTERNAL_SERVER_ERROR", "Internal Server Error"),
}

// Add to routes behind authMiddleware, the only thing that returns 401.
export const authErrorResponses: ResponsesWithResolver = {
  401: errorResponse("UNAUTHORIZED", "Unauthorized"),
}

// Add to routes with a request validator, the only thing that returns 400.
export const validationErrorResponses: ResponsesWithResolver = {
  400: errorResponse("VALIDATION_ERROR", "Invalid request payload"),
}
