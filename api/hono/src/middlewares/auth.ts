import { createMiddleware } from "hono/factory"

import { auth } from "@packages/auth"
import type { Session } from "@packages/auth"

export const authMiddleware = createMiddleware<{ Variables: Session }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) return c.json({ message: "Unauthorized" }, 401)

  c.set("session", session.session)
  c.set("user", session.user)
  await next()
})
