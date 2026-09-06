import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../stack"

// The robots route in web/next/src/app/robots.ts on a running stack: it answers and names the sitemap. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/robots.ts", () => {
  test("robots.txt answers and names the sitemap", async () => {
    const response = await new Client(WEB).fetch("/robots.txt")
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("Sitemap:")
  })
})
