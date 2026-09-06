import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../stack"

// The sitemap route in web/next/src/app/sitemap.ts on a running stack: XML that lists the docs.

describe.skipIf(!enabled)("web/next/src/app/sitemap.ts", () => {
  test("sitemap.xml answers with the docs in it", async () => {
    const response = await new Client(WEB).fetch("/sitemap.xml")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("xml")
    expect(await response.text()).toContain("/docs")
  })
})
