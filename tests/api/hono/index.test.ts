import { describe, expect, test } from "bun:test"

import { expectErrorEnvelope } from "@/http"
import { OPENAPI_PATHS, RATE_LIMIT, SITE } from "@/surface"
import { API_URL, TRUSTED_ORIGIN, UNTRUSTED_ORIGIN } from "@/urls"

// Covers api/hono/src/index.ts: the root/health/headers routes, the OpenAPI + Scalar docs, and the app-wide CORS, rate limiter, and error handler.

const VERSION_PATTERN = /^\d+\.\d+\.\d+/

describe("system endpoints", () => {
  test("GET / returns version and environment", async () => {
    const res = await fetch(`${API_URL}/`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.keys(body)).toEqual(["data"])
    expect(Object.keys(body.data).sort()).toEqual(["environment", "version"])
    expect(body.data.version).toMatch(VERSION_PATTERN)
    expect(body.data.environment).toBe("local")
  })

  test("GET /headers echoes request headers in local dev", async () => {
    const res = await fetch(`${API_URL}/headers`, { headers: { "x-probe": "1" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data["x-probe"]).toBe("1")
  })

  test("GET /api/health returns the health envelope", async () => {
    const res = await fetch(`${API_URL}/api/health`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("application/json")
    const body = await res.json()
    expect(Object.keys(body)).toEqual(["data"])
    expect(body.data.message).toBe("ok")
    expect(body.data.version).toMatch(VERSION_PATTERN)
    expect(body.data.environment).toBe("local")
  })

  test("unknown route returns the exact NOT_FOUND envelope", async () => {
    const res = await fetch(`${API_URL}/api/definitely-not-a-route`)
    const body = await expectErrorEnvelope(res, 404, "NOT_FOUND", "Not Found")
    expect(Object.keys(body.error).sort()).toEqual(["code", "message"])
  })

  test("unmatched method returns the NOT_FOUND envelope", async () => {
    const res = await fetch(`${API_URL}/api/health`, { method: "POST" })
    await expectErrorEnvelope(res, 404, "NOT_FOUND", "Not Found")
  })
})

describe("rate limiter", () => {
  test("anonymous requests carry the global rate limit headers", async () => {
    const res = await fetch(`${API_URL}/api/health`)
    expect(res.headers.get("ratelimit-limit")).toBe(String(RATE_LIMIT.anon))
    expect(res.headers.get("ratelimit-policy")).toBe(
      `${RATE_LIMIT.anon};w=${RATE_LIMIT.windowSeconds}`,
    )
    expect(Number(res.headers.get("ratelimit-remaining"))).toBeLessThan(RATE_LIMIT.anon)
  })

  test("each direct localhost request gets a fresh bucket (no client IP, UUID fallback)", async () => {
    // findIp is empty for a direct localhost fetch, so the limiter key falls back to a per-request randomUUIDv7 (api/hono/src/middlewares/rate-limiter.ts). Every request therefore reports a full budget minus one, rather than a shared, decrementing count. The invariant to preserve is the fallback, not IP identity.
    const first = await fetch(`${API_URL}/api/health`)
    const second = await fetch(`${API_URL}/api/health`)
    expect(first.headers.get("ratelimit-remaining")).toBe(String(RATE_LIMIT.anon - 1))
    expect(second.headers.get("ratelimit-remaining")).toBe(String(RATE_LIMIT.anon - 1))
  })
})

describe("CORS", () => {
  test("preflight from the trusted origin is allowed with credentials", async () => {
    const res = await fetch(`${API_URL}/api/health`, {
      method: "OPTIONS",
      headers: { origin: TRUSTED_ORIGIN, "access-control-request-method": "GET" },
    })
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("access-control-allow-origin")).toBe(TRUSTED_ORIGIN)
    expect(res.headers.get("access-control-allow-credentials")).toBe("true")
    for (const method of ["GET", "OPTIONS", "POST", "PUT"]) {
      expect(res.headers.get("access-control-allow-methods")).toContain(method)
    }
  })

  test("simple request from the trusted origin echoes the allow-origin header", async () => {
    const res = await fetch(`${API_URL}/api/health`, { headers: { origin: TRUSTED_ORIGIN } })
    expect(res.headers.get("access-control-allow-origin")).toBe(TRUSTED_ORIGIN)
    expect(res.headers.get("access-control-allow-credentials")).toBe("true")
  })

  test("an untrusted origin gets no allow-origin header", async () => {
    const res = await fetch(`${API_URL}/api/health`, { headers: { origin: UNTRUSTED_ORIGIN } })
    expect(res.headers.get("access-control-allow-origin")).toBeNull()
  })
})

describe("OpenAPI document and Scalar reference", () => {
  const openapiDoc = async () => {
    const res = await fetch(`${API_URL}/api/openapi.json`)
    expect(res.status).toBe(200)
    return res.json()
  }

  test("GET /api/openapi.json documents exactly the described routes", async () => {
    const doc = await openapiDoc()
    expect(doc.openapi).toBe("3.1.0")
    expect(doc.info.title).toBe(SITE.name)
    expect(doc.info.version).toMatch(VERSION_PATTERN)
    expect(Object.keys(doc.paths).sort()).toEqual(Object.keys(OPENAPI_PATHS).sort())
    for (const [path, methods] of Object.entries(OPENAPI_PATHS)) {
      expect(Object.keys(doc.paths[path]).sort()).toEqual(methods)
    }
  })

  test("every documented operation declares the always-reachable 429 and 500", async () => {
    const doc = await openapiDoc()
    for (const [path, methods] of Object.entries(OPENAPI_PATHS)) {
      for (const method of methods) {
        const responses = doc.paths[path][method].responses
        expect(responses["429"], `${method.toUpperCase()} ${path} missing 429`).toBeTruthy()
        expect(responses["500"], `${method.toUpperCase()} ${path} missing 500`).toBeTruthy()
      }
    }
  })

  test("auth-gated operations declare 401 and validated operations declare 400", async () => {
    const doc = await openapiDoc()
    expect(doc.paths["/api/v1/session"].get.responses["401"]).toBeTruthy()
    expect(doc.paths["/api/v1/user"].get.responses["401"]).toBeTruthy()
    expect(doc.paths["/api/waitlist"].post.responses["400"]).toBeTruthy()
  })

  test("GET /api/docs serves the Scalar reference UI", async () => {
    const res = await fetch(`${API_URL}/api/docs`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    const html = await res.text()
    expect(html).toContain(`API Reference | ${SITE.name}`)
    expect(html).toContain("/api/openapi.json")
  })
})
