import { describe, expect, test } from "bun:test"

import { enabled, WEB, withAgent } from "../../../../../../stack"

// The dashboard in web/next/src/app/(protected)/dashboard/page.tsx on a running stack: the signed-in agent gets it with its heading and its own account in the sidebar.

describe.skipIf(!enabled)("web/next/src/app/(protected)/dashboard/page.tsx", () => {
  test("the signed-in agent gets the dashboard", async () => {
    await withAgent(async (agent) => {
      const response = await agent.fetch(`${WEB}/dashboard`)
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain("Dashboard")
      expect(html).toContain("agent@local.host")
    })
  })
})
