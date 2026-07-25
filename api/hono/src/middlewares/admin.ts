import type { Session } from "@packages/auth"
import { createMiddleware } from "hono/factory"

import { ApiError } from "@/lib/error"

// Gate for admin-only routes, mirroring the console's access rule (the Better Auth Admin plugin role). Mount downstream of authMiddleware so the user variable is populated.
export const adminMiddleware = createMiddleware<{ Variables: Session }>(async (c, next) => {
  if (c.get("user").role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Admin access required")
  }
  return next()
})
