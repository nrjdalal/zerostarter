import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../stack"

// The home Open Graph image in web/next/src/app/og/home/route.tsx on a running stack: a PNG.

describe.skipIf(!enabled)("web/next/src/app/og/home/route.tsx", () => {
  test("the home image renders", async () => {
    const response = await new Client(WEB).fetch("/og/home")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("image/png")
  })
})
