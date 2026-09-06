import { describe, expect, test } from "bun:test"

import { enabled, WEB, withAgent } from "../../../../../../../../stack"

// The users page in web/next/src/app/(console)/console/(access)/users/page.tsx on a running stack: the owner gets it with the agent listed.

describe.skipIf(!enabled)("web/next/src/app/(console)/console/(access)/users/page.tsx", () => {
  test("the owner gets the users page with the agent listed", async () => {
    await withAgent(async (agent) => {
      const response = await agent.fetch(`${WEB}/console/users`)
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain("Users")
      expect(html).toContain("agent@local.host")
    })
  })
})
