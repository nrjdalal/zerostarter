import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../../stack"

// The blog in web/next/src/app/(content)/blog/[[...slug]]/page.tsx on a running stack: the index renders, an unknown slug is not found. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(content)/blog/[[...slug]]/page.tsx", () => {
  const visitor = new Client(WEB)

  test("the blog index renders", async () => {
    const response = await visitor.fetch("/blog")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
  })

  test("an unknown post is not found", async () => {
    const response = await visitor.fetch("/blog/nothing-here")
    expect(response.status).toBe(404)
  })
})
