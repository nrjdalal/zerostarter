import type { Session } from "@packages/auth"
import type { Context, Next } from "hono"

import { auth } from "@packages/auth"
import { createMiddleware } from "hono/factory"

import { createRateLimiter } from "@/middlewares/rate-limiter"

const userRateLimiter = createRateLimiter({
  getUserId: (c) => c.get("session")?.userId,
  limit: 120,
  windowMs: 60000,
})

export const authMiddleware = createMiddleware<{ Variables: Session }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ error: { code: "AUTHORIZATION_ERROR", message: "Unauthorized" } }, 401)
  }

  c.set("session", session.session)
  c.set("user", session.user)

  return userRateLimiter(c as Context, next as Next)
})
