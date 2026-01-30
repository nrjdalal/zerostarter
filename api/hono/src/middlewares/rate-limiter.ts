import type { Context } from "hono"

import { findIp } from "@arcjet/ip"
import { env } from "@packages/env/api-hono"
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
    handler: (c) =>
      c.json({ error: { code: "TOO_MANY_REQUESTS", message: "Too Many Requests" } }, 429),
  })
}

export const rateLimiterMiddleware = createRateLimiter({
  limit: env.HONO_RATE_LIMIT,
  windowMs: env.HONO_RATE_LIMIT_WINDOW_MS,
})
