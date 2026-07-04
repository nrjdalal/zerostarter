import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"

import { Browser } from "@/browser"
import { SITE } from "@/surface"

let browser: Browser

beforeAll(() => {
  browser = new Browser("golden-auth")
  browser.open("/")
})
beforeEach(() => browser.clearCookies())
afterAll(() => browser.close())

function login() {
  browser.open("/")
  browser.clickRole("button", "Login")
  browser.waitText("Login (agents)")
  browser.clickRole("button", "Login (agents)")
  browser.waitPath("/dashboard")
}

// The full dev login round-trip: landing -> Access dialog -> agent sign-in (API redirect) -> dashboard -> sign out.
describe("agent login flow", () => {
  test("logs in from the landing page and reaches the dashboard", () => {
    login()
    expect(new URL(browser.url()).pathname).toBe("/dashboard")
    expect(browser.hasText("Dashboard")).toBe(true)
    expect(browser.hasText(SITE.agent.name)).toBe(true)
  })

  test("signing out returns to the landing page and re-locks the dashboard", () => {
    login()
    // The user menu trigger is a button whose accessible name includes the agent name; open it, then click the Log out menuitem.
    browser.clickSnapshotMatch(SITE.agent.name, { interactive: true })
    browser.waitText("Log out")
    browser.clickRole("menuitem", "Log out")
    browser.run(["wait", "--fn", "location.pathname === '/'"])

    browser.open("/dashboard")
    expect(new URL(browser.url()).pathname).not.toBe("/dashboard")
  })

  test("a signed-in user sees Dashboard instead of Login on the landing page", () => {
    login()
    browser.open("/")
    expect(browser.refFor('link "Dashboard"', { interactive: true, urls: true })).not.toBeNull()
    expect(browser.hasControl("Login")).toBe(false)
  })
})
