import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../stack"

// The llms-full.txt route in web/next/src/app/(llms.txt)/llms-full.txt/route.ts on a running stack: one markdown file carrying the docs.

describe.skipIf(!enabled)("web/next/src/app/(llms.txt)/llms-full.txt/route.ts", () => {
  test("llms-full.txt is markdown that carries the docs", async () => {
    const response = await new Client(WEB).fetch("/llms-full.txt")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/markdown")
    const text = await response.text()
    expect(text.length).toBeGreaterThan(10000)
    expect(text).toContain("# ")
  })
})
