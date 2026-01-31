import type { Context } from "hono"

import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { z } from "zod"

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof z.ZodError) {
    return c.json(
      {
        error: { code: "VALIDATION_ERROR", message: "Invalid request payload", issues: err.issues },
      },
      400,
    )
  }

  const message = isLocal(env.NODE_ENV) ? err.message : "Internal Server Error"
  return c.json({ error: { code: "INTERNAL_SERVER_ERROR", message } }, 500)
}
