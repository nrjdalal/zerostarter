import { describe, expect, test } from "bun:test"

import { agentCookie, expectErrorEnvelope } from "@/http"
import { RATE_LIMIT, SITE } from "@/surface"
import { API_URL } from "@/urls"

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

describe("GET /api/v1/session", () => {
  test("anonymous requests get the exact UNAUTHORIZED envelope", async () => {
    const res = await fetch(`${API_URL}/api/v1/session`)
    await expectErrorEnvelope(res, 401, "UNAUTHORIZED", "Unauthorized")
  })

  test("authenticated requests get the session shape", async () => {
    const res = await fetch(`${API_URL}/api/v1/session`, {
      headers: { cookie: await agentCookie() },
    })
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(typeof data.id).toBe("string")
    expect(typeof data.token).toBe("string")
    expect(typeof data.userId).toBe("string")
    expect(data.createdAt).toMatch(ISO_DATETIME)
    expect(data.updatedAt).toMatch(ISO_DATETIME)
    expect(data.expiresAt).toMatch(ISO_DATETIME)
    expect(new Date(data.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })
})

describe("GET /api/v1/user", () => {
  test("anonymous requests get the exact UNAUTHORIZED envelope", async () => {
    const res = await fetch(`${API_URL}/api/v1/user`)
    await expectErrorEnvelope(res, 401, "UNAUTHORIZED", "Unauthorized")
  })

  test("authenticated requests get the agent identity", async () => {
    const res = await fetch(`${API_URL}/api/v1/user`, {
      headers: { cookie: await agentCookie() },
    })
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.name).toBe(SITE.agent.name)
    expect(data.email).toBe(SITE.agent.email)
    expect(data.emailVerified).toBe(true)
    expect(data.role).toBe("admin")
    expect(data.banned).toBe(false)
    expect(typeof data.id).toBe("string")
    expect(data.createdAt).toMatch(ISO_DATETIME)
    expect(data.updatedAt).toMatch(ISO_DATETIME)
  })

  test("authenticated users get the doubled per-user rate limit", async () => {
    const res = await fetch(`${API_URL}/api/v1/user`, {
      headers: { cookie: await agentCookie() },
    })
    expect(res.headers.get("ratelimit-limit")).toBe(String(RATE_LIMIT.user))
    expect(res.headers.get("ratelimit-policy")).toBe(
      `${RATE_LIMIT.user};w=${RATE_LIMIT.windowSeconds}`,
    )
  })
})
