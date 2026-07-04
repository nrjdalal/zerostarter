import { describe, expect, test } from "bun:test"

import { agentCookie } from "@/http"
import { WEB_URL } from "@/urls"

describe("auth gating", () => {
  test("anonymous /dashboard redirects to the landing page", async () => {
    const res = await fetch(`${WEB_URL}/dashboard`, { redirect: "manual" })
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toMatch(/^(\/|http:\/\/localhost:3000\/)$/)
  })

  test("authenticated /dashboard renders", async () => {
    const res = await fetch(`${WEB_URL}/dashboard`, {
      headers: { cookie: await agentCookie() },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("Dashboard")
  })
})

describe("console gating (admin role)", () => {
  test("anonymous /console is a 404, never a redirect", async () => {
    const res = await fetch(`${WEB_URL}/console`, { redirect: "manual" })
    expect(res.status).toBe(404)
  })

  test("anonymous /console/docs is a 404", async () => {
    const res = await fetch(`${WEB_URL}/console/docs`, { redirect: "manual" })
    expect(res.status).toBe(404)
  })

  test("admin /console renders", async () => {
    const res = await fetch(`${WEB_URL}/console`, {
      headers: { cookie: await agentCookie() },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("Console")
  })

  test("admin /console/docs renders the console docs", async () => {
    const res = await fetch(`${WEB_URL}/console/docs`, {
      headers: { cookie: await agentCookie() },
    })
    expect(res.status).toBe(200)
  })
})

describe("console search gating", () => {
  test("anonymous console search is a 404 with an empty body (index never leaks)", async () => {
    const res = await fetch(`${WEB_URL}/api/console/search?query=console`)
    expect(res.status).toBe(404)
    expect(await res.text()).toBe("")
  })

  test("admin console search returns results", async () => {
    const res = await fetch(`${WEB_URL}/api/console/search?query=console`, {
      headers: { cookie: await agentCookie() },
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })
})
