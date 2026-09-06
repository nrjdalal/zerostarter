import { describe, expect, test } from "bun:test"

import { enabled, WEB, withAgent } from "../../../../../../../stack"

// The activity page in web/next/src/app/(console)/console/activity/page.tsx on a running stack: the owner gets it.

describe.skipIf(!enabled)("web/next/src/app/(console)/console/activity/page.tsx", () => {
  test("the owner gets the activity page", async () => {
    await withAgent(async (agent) => {
      const response = await agent.fetch(`${WEB}/console/activity`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("Activity")
    })
  })
})
