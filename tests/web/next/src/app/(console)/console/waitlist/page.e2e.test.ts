import { describe, expect, test } from "bun:test"

import { enabled, signInAsAgent, signOut, WEB } from "../../../../../../../stack"

// The signups page in web/next/src/app/(console)/console/waitlist/page.tsx on a running stack: the owner gets it. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(console)/console/waitlist/page.tsx", () => {
  test("the owner gets the signups page", async () => {
    const agent = await signInAsAgent()
    const response = await agent.fetch(`${WEB}/console/waitlist`)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("Signups")
    await signOut(agent)
  })
})
