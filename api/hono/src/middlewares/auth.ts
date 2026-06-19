import type { Session } from "@packages/auth"
import { auth } from "@packages/auth"
import { env } from "@packages/env/api-hono"
import type { Context, Next } from "hono"
import { createMiddleware } from "hono/factory"

import { jsonError } from "@/lib/error"
import { createRateLimiter } from "@/middlewares/rate-limiter"

const userRateLimiter = createRateLimiter({
  getUserId: (c) => c.get("session")?.userId,
  limit: env.HONO_RATE_LIMIT * 2,
  windowMs: env.HONO_RATE_LIMIT_WINDOW_MS,
})

export const authMiddleware = createMiddleware<{ Variables: Session }>(async (c, next) => {
  const { headers, response: session } = await auth.api.getSession({
    headers: c.req.raw.headers,
    returnHeaders: true,
  })

  // forward the session_data cookie so the cookie cache actually primes;
  // getSession without this silently drops better-auth's Set-Cookie
  for (const cookie of headers.getSetCookie()) {
    c.header("Set-Cookie", cookie, { append: true })
  }

  if (!session) {
    return jsonError(c, 401, "UNAUTHORIZED", "Unauthorized")
  }

  c.set("session", session.session)
  c.set("user", session.user)

  return userRateLimiter(c as Context, next as Next)
})
