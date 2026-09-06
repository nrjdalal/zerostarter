import { describe, expect, test } from "bun:test"

import { enabled, signInAsAgent, signOut, WEB } from "../../../../../../stack"

// The dashboard in web/next/src/app/(protected)/dashboard/page.tsx on a running stack: the signed-in agent gets it with its heading and its own account in the sidebar. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(protected)/dashboard/page.tsx", () => {
  test("the signed-in agent gets the dashboard", async () => {
    const agent = await signInAsAgent()
    const response = await agent.fetch(`${WEB}/dashboard`)
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain("Dashboard")
    expect(html).toContain("agent@local.host")
    await signOut(agent)
  })
})
