import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../stack"

// The root not-found page in web/next/src/app/not-found.tsx on a running stack: a path that exists nowhere is a 404 that still renders as HTML. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/not-found.tsx", () => {
  test("an unknown path is not found, as a page", async () => {
    const response = await new Client(WEB).fetch("/nothing-here")
    expect(response.status).toBe(404)
    expect(response.headers.get("content-type")).toContain("text/html")
  })
})
