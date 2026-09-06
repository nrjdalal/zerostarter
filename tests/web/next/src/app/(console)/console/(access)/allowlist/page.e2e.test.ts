import { describe, expect, test } from "bun:test"

import { enabled, WEB, withAgent } from "../../../../../../../../stack"

// The allowlist page in web/next/src/app/(console)/console/(access)/allowlist/page.tsx on a running stack: the owner gets it.

describe.skipIf(!enabled)("web/next/src/app/(console)/console/(access)/allowlist/page.tsx", () => {
  test("the owner gets the allowlist page", async () => {
    await withAgent(async (agent) => {
      const response = await agent.fetch(`${WEB}/console/allowlist`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("Allowlist")
    })
  })
})
