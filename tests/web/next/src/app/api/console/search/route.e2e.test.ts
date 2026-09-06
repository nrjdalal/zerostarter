import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB, withAgent } from "../../../../../../../stack"

// The console docs search in web/next/src/app/api/console/search/route.ts on a running stack: absent for a visitor so the index never leaks, a JSON list for the owner.

describe.skipIf(!enabled)("web/next/src/app/api/console/search/route.ts", () => {
  test("the search does not exist for an anonymous visitor", async () => {
    const response = await new Client(WEB).fetch("/api/console/search?query=console")
    expect(response.status).toBe(404)
  })

  test("the owner gets a list of hits", async () => {
    await withAgent(async (agent) => {
      const { status, body } = await agent.json<unknown[]>(
        `${WEB}/api/console/search?query=console`,
      )
      expect(status).toBe(200)
      expect(Array.isArray(body)).toBe(true)
    })
  })
})
