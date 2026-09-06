import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB, withAgent } from "../../../../../../stack"

// The console layout in web/next/src/app/(console)/console/layout.tsx on a running stack, which applies the gate: below the rung the console does not exist (a 404, never a redirect, so it is never advertised), and the agent, an owner, gets the console home.

describe.skipIf(!enabled)("web/next/src/app/(console)/console/layout.tsx", () => {
  test("the console does not exist for an anonymous visitor", async () => {
    const response = await new Client(WEB).fetch("/console")
    expect(response.status).toBe(404)
  })

  test("the owner gets the console home", async () => {
    await withAgent(async (agent) => {
      const response = await agent.fetch(`${WEB}/console`)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("Console")
    })
  })
})
