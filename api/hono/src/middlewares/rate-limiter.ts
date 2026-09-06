import { findIp } from "@arcjet/ip"
import { env } from "@packages/env/api-hono"
import { hash } from "bun"
import type { Context } from "hono"
import { rateLimiter } from "hono-rate-limiter"
import { getConnInfo } from "hono/bun"

import { jsonError } from "@/lib/error"
import { onVercel } from "@/lib/server"

// The peer Bun accepted the connection from, or undefined under another adapter (Vercel's Node server, a test context) whose env is not the Bun server. A dual-stack listener reports an IPv4 client as ::ffff:a.b.c.d, which the IP library does not classify, so it is unwrapped first.
const peerAddress = (c: Context): string | undefined => {
  if (onVercel) return undefined
  try {
    const address = getConnInfo(c).remote.address
    return address && address.startsWith("::ffff:") ? address.slice("::ffff:".length) : address
  } catch {
    return undefined
  }
}

// Only x-forwarded-for reaches the IP library, never its fallbacks (forwarded, true-client-ip, x-client-ip, x-real-ip): a proxy that forwards the client sets this one and Vercel overwrites it outright, while any other header behind a private peer is the client naming its own bucket.
const forwardedHeaders = (c: Context): Headers => {
  const headers = new Headers()
  const value = c.req.raw.headers.get("x-forwarded-for")
  if (value) headers.set("x-forwarded-for", value)
  return headers
}

// The address the IP tier bills. A public peer is the client itself and no header overrides it; a private peer is a proxy or a sibling service, and the client is what it forwarded, last hop first; a private peer that forwarded nothing is internal traffic (off Vercel: the web app's server-side calls, a health check) and is not billed, since pooling it into one bucket would throttle every user at once.
export const clientAddress = (c: Context): { address: string; internal: boolean } => {
  const peer = peerAddress(c)
  const address = findIp({ headers: forwardedHeaders(c), ip: peer })
  if (address) return { address, internal: false }
  return { address: peer ?? "unknown", internal: peer !== undefined }
}

type Resolver = (c: Context) => string | undefined

type Decision = { key: string; skip: boolean }

// The bucket a request bills, and whether it bills one at all. Only the IP tier has an internal case: a request the limiter can name by user or key is always billed.
export const rateLimitDecision = (
  c: Context,
  getUserId?: Resolver,
  getApiKey?: Resolver,
): Decision => {
  const userId = getUserId && getUserId(c)
  if (userId) return { key: `userid:${userId}`, skip: false }

  const apiKey = getApiKey && getApiKey(c)
  if (apiKey) return { key: `apikey:${hash(apiKey).toString(16)}`, skip: false }

  const { address, internal } = clientAddress(c)
  return { key: `ip:${address}`, skip: internal }
}

// One limiter's decision for a request, made once: the limiter asks skip and then keyGenerator about the same request. Held per limiter rather than in a context variable because the global and the per-user limiter both see one request and must not read each other's answer.
export const rateLimitDecider = (getUserId?: Resolver, getApiKey?: Resolver) => {
  const decisions = new WeakMap<Request, Decision>()
  return (c: Context): Decision => {
    const remembered = decisions.get(c.req.raw)
    if (remembered) return remembered
    const decision = rateLimitDecision(c, getUserId, getApiKey)
    decisions.set(c.req.raw, decision)
    return decision
  }
}

interface RateLimiterConfig {
  getApiKey?: Resolver
  getUserId?: Resolver
  limit?: number
  windowMs?: number
}

export function createRateLimiter(config: RateLimiterConfig = {}) {
  const { getApiKey, getUserId, limit = 60, windowMs = 60000 } = config
  const decide = rateLimitDecider(getUserId, getApiKey)

  return rateLimiter({
    handler: (c) => jsonError(c, 429, "TOO_MANY_REQUESTS", "Too Many Requests"),
    keyGenerator: (c) => decide(c).key,
    limit,
    skip: (c) => decide(c).skip,
    windowMs,
  })
}

export const rateLimiterMiddleware = createRateLimiter({
  limit: env.HONO_RATE_LIMIT,
  windowMs: env.HONO_RATE_LIMIT_WINDOW_MS,
})
