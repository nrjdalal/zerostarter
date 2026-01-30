import type { Context, ErrorHandler } from "hono"

import { envApiHono as env, isLocal } from "@packages/env"
import { z } from "zod"

export const errorHandler: ErrorHandler = (error, c: Context) => {
  console.error(error)
  if (error instanceof z.ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          issues: error.issues,
        },
      },
      400,
    )
  }
  if (error instanceof Error) {
    return c.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: isLocal(env.NODE_ENV) ? error.message : "An unexpected error occurred",
        },
      },
      500,
    )
  }
  return c.json(
    {
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500,
  )
}
