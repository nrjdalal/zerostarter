import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../../stack"

// The docs Open Graph image in web/next/src/app/og/docs/[[...slug]]/route.tsx on a running stack: a PNG for the index and for a page.

describe.skipIf(!enabled)("web/next/src/app/og/docs/[[...slug]]/route.tsx", () => {
  test("the docs images render", async () => {
    const visitor = new Client(WEB)
    for (const path of ["/og/docs", "/og/docs/getting-started/scripts"]) {
      const response = await visitor.fetch(path)
      expect(response.status, path).toBe(200)
      expect(response.headers.get("content-type"), path).toContain("image/png")
    }
  })
})
