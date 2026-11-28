import { findIp } from "@arcjet/ip"
import { env } from "@packages/env/api-hono"
import { hash } from "bun"
import type { Context } from "hono"
import { rateLimiter } from "hono-rate-limiter"

import { jsonError } from "@/lib/error"
import { onVercel } from "@/lib/server"

// The connection's peer, which Bun.serve() reports through the server it passes fetch as env (local, Docker, self-host); none on Vercel, whose function sees only Vercel's proxy.
function peerAddress(c: Context): string | undefined {
  if (onVercel) return
  const server = c.env as
    | { requestIP?: (request: Request) => { address: string } | null }
    | undefined
  return server?.requestIP?.(c.req.raw)?.address
}

// A public peer is the client, so a header it sends cannot pick its bucket; behind a private or loopback peer (a proxy, or a client on the same network) the first public forwarding address names the client; on Vercel, the x-real-ip Vercel sets. Undefined for internal traffic: a private or loopback peer whose headers name no public client, as the web app's server-side calls, a dev run and the golden suite are.
function clientIp(c: Context): string | undefined {
  const peer = peerAddress(c)
  const ip = findIp(
    { headers: c.req.raw.headers, socket: { remoteAddress: peer } },
    onVercel ? { platform: "vercel" } : undefined,
  )
  return ip || undefined
}

// Each request's key, worked out once for skip and then keyGenerator, which the limiter calls in that order; undefined for internal traffic, which skips the limit and stores no key.
const keys = new WeakMap<Context, string | undefined>()

function generateRateLimitKey(
  c: Context,
  getUserId?: (c: Context) => string | undefined,
  getApiKey?: (c: Context) => string | undefined,
): string | undefined {
  if (keys.has(c)) return keys.get(c)
  const userId = getUserId?.(c)
  const apiKey = userId ? undefined : getApiKey?.(c)
  const ip = userId || apiKey ? undefined : clientIp(c)
  const key = userId
    ? `userid:${userId}`
    : apiKey
      ? `apikey:${hash(apiKey).toString(16)}`
      : ip && `ip:${ip}`
  keys.set(c, key)
  return key
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
    skip: (c) => generateRateLimitKey(c, getUserId, getApiKey) === undefined,
    keyGenerator: (c) => generateRateLimitKey(c, getUserId, getApiKey) ?? "",
    handler: (c) => jsonError(c, 429, "TOO_MANY_REQUESTS", "Too Many Requests"),
  })
}

export const rateLimiterMiddleware = createRateLimiter({
  limit: env.HONO_RATE_LIMIT,
  windowMs: env.HONO_RATE_LIMIT_WINDOW_MS,
})
