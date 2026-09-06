import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../../stack"

// The llms.txt route in web/next/src/app/(llms.txt)/llms.txt/[[...slug]]/route.ts on a running stack: markdown that links the docs. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/app/(llms.txt)/llms.txt/[[...slug]]/route.ts", () => {
  test("llms.txt is markdown that links the docs", async () => {
    const response = await new Client(WEB).fetch("/llms.txt")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/markdown")
    expect(await response.text()).toContain("/docs/")
  })
})
