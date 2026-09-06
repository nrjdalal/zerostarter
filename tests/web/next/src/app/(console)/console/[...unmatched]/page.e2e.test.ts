import { describe, expect, test } from "bun:test"

import { enabled, WEB, withAgent } from "../../../../../../../stack"

// The catch-all in web/next/src/app/(console)/console/[...unmatched]/page.tsx on a running stack: a console path that does not exist is a 404 even for the owner.

describe.skipIf(!enabled)("web/next/src/app/(console)/console/[...unmatched]/page.tsx", () => {
  test("an unknown console path is not found for the owner", async () => {
    await withAgent(async (agent) => {
      const response = await agent.fetch(`${WEB}/console/nothing-here`)
      expect(response.status).toBe(404)
    })
  })
})
