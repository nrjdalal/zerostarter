import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../stack"

// The root layout in web/next/src/app/layout.tsx on a running stack: it renders the document, and the Speed Insights beacon it mounts only on Vercel is absent here, since off Vercel the beacon would post to a route nothing serves. A local-stage stack is the only kind this suite runs against, so the Vercel half of that switch is not observable from here.

describe.skipIf(!enabled)("web/next/src/app/layout.tsx", () => {
  test("the document renders without the Speed Insights beacon off Vercel", async () => {
    const response = await new Client(WEB).fetch("/")
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain("<html")
    expect(html).not.toContain("/_vercel/speed-insights")
  })
})
