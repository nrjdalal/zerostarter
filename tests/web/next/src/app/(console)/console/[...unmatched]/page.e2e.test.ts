import { describe, expect, test } from "bun:test"

import { enabled, signInAsAgent, signOut, WEB } from "../../../../../../../stack"

// The catch-all in web/next/src/app/(console)/console/[...unmatched]/page.tsx on a running stack: a console path that does not exist is a 404 even for the owner. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(console)/console/[...unmatched]/page.tsx", () => {
  test("an unknown console path is not found for the owner", async () => {
    const agent = await signInAsAgent()
    try {
      const response = await agent.fetch(`${WEB}/console/nothing-here`)
      expect(response.status).toBe(404)
    } finally {
      await signOut(agent)
    }
  })
})
