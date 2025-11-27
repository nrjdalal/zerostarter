import { createMiddleware } from "hono/factory"
import { auth } from "@/lib/auth"
import type { Session, User } from "@/lib/auth"

export type Env = {
  Variables: {
    session: Session
    user: User
  }
}

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) return c.json({ message: "Unauthorized" }, 401)

  c.set("session", session.session)
  c.set("user", session.user)
  await next()
})
