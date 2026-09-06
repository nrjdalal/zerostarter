import { describe, expect, test } from "bun:test"

import { Client, enabled, signInAsAgent, WEB } from "../../../../../stack"

// The protected layout in web/next/src/app/(protected)/layout.tsx on a running stack: an anonymous visitor is sent home, and the signed-in agent, carrying the API's session cookie, gets the dashboard. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(protected)/layout.tsx", () => {
  test("an anonymous visitor is sent home", async () => {
    const response = await new Client(WEB).fetch("/dashboard")
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("/")
  })

  test("the signed-in agent gets the dashboard", async () => {
    const agent = await signInAsAgent()
    const response = await fetch(`${WEB}/dashboard`, {
      headers: { cookie: agent.cookieHeader() },
      redirect: "manual",
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("Dashboard")
  })
})
