import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser, ensureAgentState } from "@/browser"
import { agentCookie, uniqueEmail } from "@/http"
import { API_URL, TRUSTED_ORIGIN } from "@/urls"

let browser: Browser

beforeAll(async () => {
  const state = await ensureAgentState()
  browser = new Browser("golden-organizations", state)
})
afterAll(() => browser.close())

// The dashboard org switcher: create an organization, see it become active, then delete it via the auth API so runs stay clean.
describe("dashboard organization switcher", () => {
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

    // Verify + clean up through the API (Better Auth needs a trusted Origin on credentialed POSTs).
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
