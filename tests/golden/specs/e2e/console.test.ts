import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser, ensureAgentState } from "@/browser"

let browser: Browser

// Admin console flows use a browser preloaded with the saved agent state (role admin).
beforeAll(async () => {
  const state = await ensureAgentState()
  browser = new Browser("golden-console", state)
})
afterAll(() => browser.close())

describe("admin console", () => {
  test("the console home renders for an admin", () => {
    browser.open("/console")
    expect(new URL(browser.url()).pathname).toBe("/console")
    expect(browser.hasText("Console")).toBe(true)
  })

  test("console docs render with their own search", () => {
    browser.open("/console/docs")
    expect(browser.isVisible('input[placeholder="Search"]')).toBe(true)
  })

  test("the dashboard renders for the signed-in agent", () => {
    browser.open("/dashboard")
    expect(new URL(browser.url()).pathname).toBe("/dashboard")
    expect(browser.hasText("Dashboard")).toBe(true)
  })
})
