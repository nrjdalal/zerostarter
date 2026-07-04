import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser, ensureAgentState } from "@/browser"
import { agentCookie, uniqueEmail } from "@/http"
import { API_URL, TRUSTED_ORIGIN, WEB_URL } from "@/urls"

// Covers web/next/src/app/(protected)/dashboard: the auth redirect gate and the dashboard organization switcher.

describe("dashboard auth gating", () => {
  test("anonymous /dashboard redirects to the landing page", async () => {
    const res = await fetch(`${WEB_URL}/dashboard`, { redirect: "manual" })
    expect(res.status).toBe(307)
    // The redirect target is the landing page, emitted either relative or absolute; derive from WEB_URL so a TESTS_WEB_URL override still passes.
    const location = res.headers.get("location")
    expect(location === "/" || location === `${WEB_URL}/`).toBe(true)
  })

  test("authenticated /dashboard renders", async () => {
    const res = await fetch(`${WEB_URL}/dashboard`, { headers: { cookie: await agentCookie() } })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("Dashboard")
  })
})

// The org switcher: create an organization, see it become active, then delete it via the auth API so runs stay clean.
describe("dashboard organization switcher", () => {
  let browser: Browser

  beforeAll(async () => {
    browser = new Browser("zs-dashboard", await ensureAgentState())
  })
  afterAll(() => browser.close())

  test("creates an organization and makes it the active one", async () => {
    const orgName = `Golden Org ${uniqueEmail().split("@")[0].slice(-6)}`

    browser.open("/dashboard")
    expect(browser.hasText("Dashboard")).toBe(true)

    // The org switcher trigger renders empty until its data loads; wait for the label before opening it.
    browser.waitText("Select Organization")
    browser.clickSnapshotMatch("Select Organization", { interactive: true })
    browser.waitText("Create organization")
    browser.clickRole("menuitem", "Create organization")

    browser.waitText("Create a new organization")
    browser.fillPlaceholder("Acme Inc.", orgName)
    browser.clickRole("button", "Create organization")

    browser.waitText("Organization created!")
    expect(browser.hasText(orgName)).toBe(true)

    const cookie = await agentCookie()
    const orgs = await (
      await fetch(`${API_URL}/api/auth/organization/list`, { headers: { cookie } })
    ).json()
    const created = orgs.find((o: { name: string }) => o.name === orgName)
    expect(created).toBeTruthy()

    const del = await fetch(`${API_URL}/api/auth/organization/delete`, {
      method: "POST",
      headers: { cookie, origin: TRUSTED_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ organizationId: created.id }),
    })
    expect(del.ok).toBe(true)
  })
})
