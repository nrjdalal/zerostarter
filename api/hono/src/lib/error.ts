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

// OpenAPI responses for the shared error statuses, each with its own code/message example.
export const errorResponses: ResponsesWithResolver = Object.fromEntries(
  (
    [
      [400, "VALIDATION_ERROR", "Invalid request payload"],
      [401, "UNAUTHORIZED", "Unauthorized"],
      [403, "FORBIDDEN", "Forbidden"],
      [404, "NOT_FOUND", "Not Found"],
      [429, "TOO_MANY_REQUESTS", "Too Many Requests"],
      [500, "INTERNAL_SERVER_ERROR", "Internal Server Error"],
    ] as const
  ).map(([status, code, message]) => [
    status,
    {
      description: message,
      content: {
        "application/json": {
          schema: resolver(errorEnvelope),
          example: { error: { code, message } },
        },
      },
    },
  ]),
)
