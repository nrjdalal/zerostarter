import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../stack"

// The hire page in web/next/src/app/(marketing)/hire/page.tsx on a running stack: it renders.

describe.skipIf(!enabled)("web/next/src/app/(marketing)/hire/page.tsx", () => {
  test("the hire page renders", async () => {
    const response = await new Client(WEB).fetch("/hire")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
  })
})
