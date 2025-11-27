import { createMiddleware } from "hono/factory"
import { auth } from "@/lib/auth"
import type { Session, User } from "@/lib/auth"

export type Env = {
  Variables: {
    user: User
    session: Session
  }
}

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ message: "Unauthorized" }, 401)
  }

  c.set("user", session.user)
  c.set("session", session.session)
  await next()
})
