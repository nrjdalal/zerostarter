import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../stack"

// The resume page in web/next/src/app/(marketing)/resume/page.tsx on a running stack: it renders. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(marketing)/resume/page.tsx", () => {
  test("the resume page renders", async () => {
    const response = await new Client(WEB).fetch("/resume")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
  })
})
