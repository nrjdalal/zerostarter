import { describe, expect, test } from "bun:test"

import { enabled, signInAsAgent, signOut, WEB } from "../../../../../../../../stack"

// The users page in web/next/src/app/(console)/console/(access)/users/page.tsx on a running stack: the owner gets it with the agent listed. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(console)/console/(access)/users/page.tsx", () => {
  test("the owner gets the users page with the agent listed", async () => {
    const agent = await signInAsAgent()
    try {
      const response = await agent.fetch(`${WEB}/console/users`)
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain("Users")
      expect(html).toContain("agent@local.host")
    } finally {
      await signOut(agent)
    }
  })
})
