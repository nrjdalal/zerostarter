import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { z } from "zod"

// Single source of the API error shape, reused by the OpenAPI error responses in index.ts.
export const errorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})

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
