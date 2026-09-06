import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB, withAgent } from "../../../../../../../../stack"

// The console docs in web/next/src/app/(console)/console/docs/[[...slug]]/page.tsx on a running stack: absent for a visitor, rendered for the owner.

describe.skipIf(!enabled)("web/next/src/app/(console)/console/docs/[[...slug]]/page.tsx", () => {
  test("the console docs do not exist for an anonymous visitor", async () => {
    const response = await new Client(WEB).fetch("/console/docs")
    expect(response.status).toBe(404)
  })

  test("the owner gets the console docs", async () => {
    await withAgent(async (agent) => {
      const response = await agent.fetch(`${WEB}/console/docs`)
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("text/html")
    })
  })
})
