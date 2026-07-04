import { describe, expect, test } from "bun:test"

import { expectErrorEnvelope } from "@/http"
import { RATE_LIMIT } from "@/surface"
import { API_URL, TRUSTED_ORIGIN, UNTRUSTED_ORIGIN } from "@/urls"

const VERSION_PATTERN = /^\d+\.\d+\.\d+/

describe("API system endpoints", () => {
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
    const res = await fetch(`${API_URL}/headers`, {
      headers: { "x-golden-probe": "1" },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data["x-golden-probe"]).toBe("1")
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

  test("anonymous requests carry the global rate limit headers", async () => {
    const res = await fetch(`${API_URL}/api/health`)
    expect(res.headers.get("ratelimit-limit")).toBe(String(RATE_LIMIT.anon))
    expect(res.headers.get("ratelimit-policy")).toBe(
      `${RATE_LIMIT.anon};w=${RATE_LIMIT.windowSeconds}`,
    )
    expect(Number(res.headers.get("ratelimit-remaining"))).toBeLessThan(RATE_LIMIT.anon)
  })

  test("rate limiting keys on client IP, so local requests never share a bucket", async () => {
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
      headers: {
        origin: TRUSTED_ORIGIN,
        "access-control-request-method": "GET",
      },
    })
    expect(res.status).toBeLessThan(300)
    expect(res.headers.get("access-control-allow-origin")).toBe(TRUSTED_ORIGIN)
    expect(res.headers.get("access-control-allow-credentials")).toBe("true")
    for (const method of ["GET", "OPTIONS", "POST", "PUT"]) {
      expect(res.headers.get("access-control-allow-methods")).toContain(method)
    }
  })

  test("simple request from the trusted origin echoes the allow-origin header", async () => {
    const res = await fetch(`${API_URL}/api/health`, {
      headers: { origin: TRUSTED_ORIGIN },
    })
    expect(res.headers.get("access-control-allow-origin")).toBe(TRUSTED_ORIGIN)
    expect(res.headers.get("access-control-allow-credentials")).toBe("true")
  })

  test("an untrusted origin gets no allow-origin header", async () => {
    const res = await fetch(`${API_URL}/api/health`, {
      headers: { origin: UNTRUSTED_ORIGIN },
    })
    expect(res.headers.get("access-control-allow-origin")).toBeNull()
  })
})
