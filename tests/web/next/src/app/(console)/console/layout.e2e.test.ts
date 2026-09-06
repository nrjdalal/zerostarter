import { describe, expect, test } from "bun:test"

import { Client, enabled, signInAsAgent, signOut, WEB } from "../../../../../../stack"

// The console layout in web/next/src/app/(console)/console/layout.tsx on a running stack, which applies the gate: below the rung the console does not exist (a 404, never a redirect, so it is never advertised), and the agent, an owner, gets the console home. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(console)/console/layout.tsx", () => {
  test("the console does not exist for an anonymous visitor", async () => {
    const response = await new Client(WEB).fetch("/console")
    expect(response.status).toBe(404)
  })

  test("the owner gets the console home", async () => {
    const agent = await signInAsAgent()
    try {
      const response = await agent.fetch(`${WEB}/console`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("Console")
    } finally {
      await signOut(agent)
    }
  })
})
