import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../../stack"

// The docs in web/next/src/app/(content)/docs/[[...slug]]/page.tsx on a running stack: the index and one page render, an unknown slug is not found. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(content)/docs/[[...slug]]/page.tsx", () => {
  const visitor = new Client(WEB)

  test("the docs index and a page render", async () => {
    for (const path of ["/docs", "/docs/getting-started/scripts"]) {
      const response = await visitor.fetch(path)
      expect(response.status, path).toBe(200)
      expect(response.headers.get("content-type"), path).toContain("text/html")
    }
  })

  test("an unknown docs slug is not found", async () => {
    const response = await visitor.fetch("/docs/nothing-here")
    expect(response.status).toBe(404)
  })
})
