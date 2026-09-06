import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../stack"

// The landing page in web/next/src/app/(marketing)/page.tsx on a running stack: it renders as HTML with a title. Markup changes with every design pass, so this asserts status and content type, not the page.

describe.skipIf(!enabled)("web/next/src/app/(marketing)/page.tsx", () => {
  test("the landing page renders", async () => {
    const response = await new Client(WEB).fetch("/")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
    expect(await response.text()).toContain("<title>")
  })
})
