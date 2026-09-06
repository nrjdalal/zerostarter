import { describe, expect, test } from "bun:test"

import { enabled, WEB, withAgent } from "../../../../../../../stack"

// The signups page in web/next/src/app/(console)/console/waitlist/page.tsx on a running stack: the owner gets it.

describe.skipIf(!enabled)("web/next/src/app/(console)/console/waitlist/page.tsx", () => {
  test("the owner gets the signups page", async () => {
    await withAgent(async (agent) => {
      const response = await agent.fetch(`${WEB}/console/waitlist`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("Signups")
    })
  })
})
