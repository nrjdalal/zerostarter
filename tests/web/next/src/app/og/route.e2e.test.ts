import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../stack"

// The Open Graph image in web/next/src/app/og/route.tsx on a running stack: a PNG, with or without a title. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/og/route.tsx", () => {
  test("the image renders with and without a title", async () => {
    const visitor = new Client(WEB)
    for (const path of ["/og", "/og?title=Golden&section=Docs"]) {
      const response = await visitor.fetch(path)
      expect(response.status, path).toBe(200)
      expect(response.headers.get("content-type"), path).toContain("image/png")
    }
  })
})
