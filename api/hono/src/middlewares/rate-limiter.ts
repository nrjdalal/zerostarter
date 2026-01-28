import type { Context } from "hono"

import { findIp } from "@arcjet/ip"
import { hash, randomUUIDv7 } from "bun"
import { rateLimiter } from "hono-rate-limiter"

function generateRateLimitKey(
  c: Context,
  getUserId?: (c: Context) => string | undefined,
  getApiKey?: (c: Context) => string | undefined,
): string {
  const userId = getUserId?.(c)
  if (userId) return `userid:${userId}`

  const apiKey = getApiKey?.(c)
  if (apiKey) return `apikey:${hash(apiKey).toString(16)}`

  return `ip:${findIp(c.req.raw) || randomUUIDv7()}`
}

interface RateLimiterConfig {
  limit?: number
  windowMs?: number
  getUserId?: (c: Context) => string | undefined
  getApiKey?: (c: Context) => string | undefined
}

export function createRateLimiter(config: RateLimiterConfig = {}) {
  const { limit = 60, windowMs = 60000, getUserId, getApiKey } = config

  return rateLimiter({
    limit,
    windowMs,
    keyGenerator: (c) => generateRateLimitKey(c, getUserId, getApiKey),
    handler: (c) => {
      return c.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        },
        429,
      )
    },
  })
}

export const rateLimiterMiddleware = createRateLimiter()
