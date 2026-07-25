import type { Session } from "@packages/auth"
import { auth } from "@packages/auth"
import type { ConsoleRole } from "@packages/auth/access"
import { roleAtLeast } from "@packages/auth/access"
import { createMiddleware } from "hono/factory"

import { ApiError } from "@/lib/error"

// Gate for console routes, mirroring the console page gate's rule and its freshness: re-read the session with the cookie cache bypassed so a grant, a demotion or a ban takes effect on the next request, not after the cache window. Mount downstream of authMiddleware, which already 401s anonymous requests off the cached read.
// Better Auth's banUser deletes the user's sessions, so the uncached read alone ejects a banned admin (with the cache they would keep access for the rest of the window); banned is still checked here so a ban applied straight to the database, bypassing the plugin, cannot leave a live session privileged.
export function requireConsoleRole(minimum: ConsoleRole) {
  return createMiddleware<{ Variables: Session }>(async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
      query: { disableCookieCache: true },
    })
    if (!session) {
      throw new ApiError(401, "UNAUTHORIZED", "Unauthorized")
    }
    if (!roleAtLeast(session.user.role, minimum) || session.user.banned) {
      throw new ApiError(403, "FORBIDDEN", "Console access required")
    }
    // Hand the uncached session to downstream handlers.
    c.set("session", session.session)
    c.set("user", session.user)
    return next()
  })
}

// The Access section, and so every route serving it, is an admin concern. A surface meant for a member calls the factory with its own rung rather than reusing this.
export const consoleAdminMiddleware = requireConsoleRole("admin")
