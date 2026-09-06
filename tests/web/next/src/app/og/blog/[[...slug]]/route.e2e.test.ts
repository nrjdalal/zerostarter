import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../../stack"

// The blog Open Graph image in web/next/src/app/og/blog/[[...slug]]/route.tsx on a running stack: a PNG for the index. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/og/blog/[[...slug]]/route.tsx", () => {
  test("the blog image renders", async () => {
    const response = await new Client(WEB).fetch("/og/blog")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("image/png")
  })
})
