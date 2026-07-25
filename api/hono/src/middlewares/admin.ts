import type { Session } from "@packages/auth"
import { auth } from "@packages/auth"
import { createMiddleware } from "hono/factory"

import { ApiError } from "@/lib/error"

// Gate for admin-only routes, mirroring the console gate's rule and its freshness: re-read the session with the cookie cache bypassed so a role grant or revoke takes effect on the next request, not after the cache window. Mount downstream of authMiddleware, which already 401s anonymous requests off the cached read.
// Better Auth's banUser deletes the user's sessions, so the uncached read alone ejects a banned admin (with the cache they would keep access for the rest of the window); banned is still checked here so a ban applied straight to the database, bypassing the plugin, cannot leave a live session privileged.
export const adminMiddleware = createMiddleware<{ Variables: Session }>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
  })
  if (!session) {
    throw new ApiError(401, "UNAUTHORIZED", "Unauthorized")
  }
  if (session.user.role !== "admin" || session.user.banned) {
    throw new ApiError(403, "FORBIDDEN", "Admin access required")
  }
  // Hand the uncached session to downstream handlers.
  c.set("session", session.session)
  c.set("user", session.user)
  return next()
})
