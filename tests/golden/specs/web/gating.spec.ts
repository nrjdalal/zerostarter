import { expect, test } from "@playwright/test"

import { agentCookie } from "@/helpers"
import { WEB_URL } from "@/urls"

test.describe("auth gating", () => {
  test("anonymous /dashboard redirects to the landing page", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/dashboard`, { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers()["location"]).toMatch(/^(\/|http:\/\/localhost:3000\/)$/)
  })

  test("authenticated /dashboard renders", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/dashboard`, {
      headers: { cookie: agentCookie() },
    })
    expect(res.status()).toBe(200)
    expect(await res.text()).toContain("Dashboard")
  })
})

test.describe("console gating (admin role)", () => {
  test("anonymous /console is a 404, never a redirect", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/console`, { maxRedirects: 0 })
    expect(res.status()).toBe(404)
  })

  test("anonymous /console/docs is a 404", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/console/docs`, { maxRedirects: 0 })
    expect(res.status()).toBe(404)
  })

  test("admin /console renders", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/console`, {
      headers: { cookie: agentCookie() },
    })
    expect(res.status()).toBe(200)
    expect(await res.text()).toContain("Console")
  })

  test("admin /console/docs renders the console docs", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/console/docs`, {
      headers: { cookie: agentCookie() },
    })
    expect(res.status()).toBe(200)
  })
})

test.describe("console search gating", () => {
  test("anonymous console search is a 404 with an empty body (index never leaks)", async ({
    request,
  }) => {
    const res = await request.get(`${WEB_URL}/api/console/search?query=console`)
    expect(res.status()).toBe(404)
    expect(await res.text()).toBe("")
  })

  test("admin console search returns results", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/api/console/search?query=console`, {
      headers: { cookie: agentCookie() },
    })
    expect(res.status()).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })
})
