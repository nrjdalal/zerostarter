import { findIp } from "@arcjet/ip"
import { env } from "@packages/env/api-hono"
import { hash } from "bun"
import type { Context } from "hono"
import { rateLimiter } from "hono-rate-limiter"

import { jsonError } from "@/lib/error"

const onVercel = process.env.VERCEL === "1"

// The connection's peer, which Bun.serve() reports through the server it passes fetch as env (local, Docker, self-host), with a dual-stack listener's ::ffff:a.b.c.d read as a.b.c.d; none on Vercel, whose function sees only Vercel's proxy.
function peerAddress(c: Context): string | undefined {
  if (onVercel) return
  const server = c.env as
    | { requestIP?: (request: Request) => { address: string } | null }
    | undefined
  const address = server?.requestIP?.(c.req.raw)?.address
  return address?.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, "")
}

// A public peer is the client, so a header it sends cannot pick its bucket; behind a private or loopback peer (a proxy, or a client on the same network) the first public forwarding address names the client; on Vercel, the x-real-ip Vercel sets. Undefined for internal traffic: a private or loopback peer whose headers name no public client, as the web app's server-side calls, a dev run and the golden suite are.
function clientIp(c: Context): string | undefined {
  const ip = findIp(
    { headers: c.req.raw.headers, socket: { remoteAddress: peerAddress(c) } },
    onVercel ? { platform: "vercel" } : undefined,
  )
  return ip || undefined
}

// Undefined for internal traffic, which skips the limit and stores no key.
function generateRateLimitKey(
  c: Context,
  getUserId?: (c: Context) => string | undefined,
  getApiKey?: (c: Context) => string | undefined,
): string | undefined {
  const userId = getUserId?.(c)
  if (userId) return `userid:${userId}`

  const apiKey = getApiKey?.(c)
  if (apiKey) return `apikey:${hash(apiKey).toString(16)}`

  const ip = clientIp(c)
  if (ip) return `ip:${ip}`
}

interface RateLimiterConfig {
  limit?: number
  windowMs?: number
  getUserId?: (c: Context) => string | undefined
  getApiKey?: (c: Context) => string | undefined
}

export function createRateLimiter(config: RateLimiterConfig = {}) {
  const { limit = 60, windowMs = 60000, getUserId, getApiKey } = config
  // This limiter's own key for each request, worked out once for skip and then keyGenerator, which it calls in that order.
  const keys = new WeakMap<Context, string | undefined>()
  const keyOf = (c: Context) => {
    if (!keys.has(c)) keys.set(c, generateRateLimitKey(c, getUserId, getApiKey))
    return keys.get(c)
  }

  return rateLimiter({
    limit,
    windowMs,
    skip: (c) => keyOf(c) === undefined,
    keyGenerator: (c) => keyOf(c) ?? "",
    handler: (c) => jsonError(c, 429, "TOO_MANY_REQUESTS", "Too Many Requests"),
  })
}

export const rateLimiterMiddleware = createRateLimiter({
  limit: env.HONO_RATE_LIMIT,
  windowMs: env.HONO_RATE_LIMIT_WINDOW_MS,
})
