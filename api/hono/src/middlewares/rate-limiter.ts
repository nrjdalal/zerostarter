import { findIp } from "@arcjet/ip"
import { env } from "@packages/env/api-hono"
import { hash } from "bun"
import type { Context } from "hono"
import { rateLimiter } from "hono-rate-limiter"
import { getConnInfo } from "hono/bun"

import { jsonError } from "@/lib/error"

// Vercel fronts the function with its own proxy and overwrites x-forwarded-for with the client, also through the web's /api rewrite; everywhere else Bun owns the socket (lib/server.ts) and the peer address is authoritative.
const onVercel = process.env.VERCEL === "1"

// The peer Bun accepted the connection from, or undefined under another adapter (Vercel's Node server, a test context) whose env is not the Bun server. A dual-stack listener reports an IPv4 client as ::ffff:a.b.c.d, which the IP library does not classify, so it is unwrapped first: left as is, a public IPv4 client would read as internal and never be billed.
const peerAddress = (c: Context): string | undefined => {
  if (onVercel) return undefined
  try {
    const address = getConnInfo(c).remote.address
    return address && address.startsWith("::ffff:") ? address.slice("::ffff:".length) : address
  } catch {
    return undefined
  }
}

// The address the IP tier bills. A public peer is the client itself and no header overrides it, so a forged x-forwarded-for on a direct deploy changes nothing; a private peer is a proxy or a sibling service, and the client is whatever it forwarded in x-forwarded-for, read last hop first. No platform option: Vercel's would read x-real-ip first, whose value behind a rewrite is not established, while x-forwarded-for is the client production has keyed on all along, directly and through the web's /api rewrite. A private peer that forwarded nothing is internal traffic, the web app's server-side calls or a health check, and is not billed: pooling it into one bucket would throttle every user at once.
export const clientAddress = (c: Context): { address: string; internal: boolean } => {
  const peer = peerAddress(c)
  const address = findIp({ headers: c.req.raw.headers, ip: peer })
  if (address) return { address, internal: false }
  return { address: peer ?? "unknown", internal: peer !== undefined }
}

type Resolver = (c: Context) => string | undefined

// The bucket a request bills, and whether it bills one at all. Only the IP tier has an internal case: a request the limiter can name by user or key is always billed.
export const rateLimitDecision = (
  c: Context,
  getUserId?: Resolver,
  getApiKey?: Resolver,
): { key: string; skip: boolean } => {
  const userId = getUserId && getUserId(c)
  if (userId) return { key: `userid:${userId}`, skip: false }

  const apiKey = getApiKey && getApiKey(c)
  if (apiKey) return { key: `apikey:${hash(apiKey).toString(16)}`, skip: false }

  const { address, internal } = clientAddress(c)
  return { key: `ip:${address}`, skip: internal }
}

interface RateLimiterConfig {
  limit?: number
  windowMs?: number
  getUserId?: Resolver
  getApiKey?: Resolver
}

export function createRateLimiter(config: RateLimiterConfig = {}) {
  const { limit = 60, windowMs = 60000, getUserId, getApiKey } = config

  return rateLimiter({
    limit,
    windowMs,
    keyGenerator: (c) => rateLimitDecision(c, getUserId, getApiKey).key,
    skip: (c) => rateLimitDecision(c, getUserId, getApiKey).skip,
    handler: (c) => jsonError(c, 429, "TOO_MANY_REQUESTS", "Too Many Requests"),
  })
}

export const rateLimiterMiddleware = createRateLimiter({
  limit: env.HONO_RATE_LIMIT,
  windowMs: env.HONO_RATE_LIMIT_WINDOW_MS,
})
