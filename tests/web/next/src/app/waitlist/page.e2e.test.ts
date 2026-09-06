import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../stack"

// The public waitlist page in web/next/src/app/waitlist/page.tsx on a running stack: it renders.

describe.skipIf(!enabled)("web/next/src/app/waitlist/page.tsx", () => {
  test("the waitlist page renders", async () => {
    const response = await new Client(WEB).fetch("/waitlist")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
  })
})
