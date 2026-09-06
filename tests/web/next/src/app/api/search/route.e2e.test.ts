import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../stack"

// The docs search in web/next/src/app/api/search/route.ts on a running stack: a query answers a JSON list of hits. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/api/search/route.ts", () => {
  test("a query answers a list of hits", async () => {
    const { status, body } = await new Client(WEB).json<unknown[]>("/api/search?query=auth")
    expect(status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })
})
