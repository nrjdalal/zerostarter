import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser, ensureAgentState } from "@/browser"
import { agentCookie } from "@/http"
import { WEB_URL } from "@/urls"

// Covers web/next/src/app/(console): the admin (role) gate on /console and /console/docs, the gated /api/console/search route, and the console rendering for an admin.

describe("console gating (admin role)", () => {
  test("anonymous /console is a 404, never a redirect", async () => {
    expect((await fetch(`${WEB_URL}/console`, { redirect: "manual" })).status).toBe(404)
  })

  test("anonymous /console/docs is a 404", async () => {
    expect((await fetch(`${WEB_URL}/console/docs`, { redirect: "manual" })).status).toBe(404)
  })

  test("admin /console renders", async () => {
    const res = await fetch(`${WEB_URL}/console`, { headers: { cookie: await agentCookie() } })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("Console")
  })

  test("admin /console/docs renders the console docs", async () => {
    const res = await fetch(`${WEB_URL}/console/docs`, { headers: { cookie: await agentCookie() } })
    expect(res.status).toBe(200)
  })
})

describe("console search gating (/api/console/search)", () => {
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

describe("admin console rendering", () => {
  let browser: Browser

  beforeAll(async () => {
    browser = new Browser("zs-console", await ensureAgentState())
  })
  afterAll(() => browser.close())

  test("the console home renders for an admin", () => {
    browser.open("/console")
    expect(new URL(browser.url()).pathname).toBe("/console")
    expect(browser.hasText("Console")).toBe(true)
  })

  test("console docs render with their own search", () => {
    browser.open("/console/docs")
    expect(browser.isVisible('input[placeholder="Search"]')).toBe(true)
  })
})
