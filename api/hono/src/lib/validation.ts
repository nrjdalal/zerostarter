import type { Context } from "hono"

type ValidationResult = { success: true } | { success: false; error: unknown }

export const validationHook = (result: ValidationResult, c: Context) => {
  if (!result.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          issues: result.error,
        },
      },
      400,
    )
  }
}
