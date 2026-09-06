import { describe, expect, test } from "bun:test"

import { enabled, signInAsAgent, signOut, WEB } from "../../../../../../../../stack"

// The allowlist page in web/next/src/app/(console)/console/(access)/allowlist/page.tsx on a running stack: the owner gets it. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(console)/console/(access)/allowlist/page.tsx", () => {
  test("the owner gets the allowlist page", async () => {
    const agent = await signInAsAgent()
    try {
      const response = await agent.fetch(`${WEB}/console/allowlist`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("Allowlist")
    } finally {
      await signOut(agent)
    }
  })
})
