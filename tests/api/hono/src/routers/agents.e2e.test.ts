import { describe, expect, test } from "bun:test"

import { API, Client, enabled, signOut, WEB } from "../../../../stack"

// The local-only agent sign-in in api/hono/src/routers/agents.ts on a running stack: it refuses an untrusted Origin and, from a trusted one, mints a session and sends the agent to the dashboard.

describe.skipIf(!enabled)("api/hono/src/routers/agents.ts", () => {
  test("an untrusted origin is refused", async () => {
    const response = await new Client(API).fetch("/api/agents/sign-in-as", {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    })
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchSnapshot()
  })

  test("a trusted origin gets a session and the dashboard", async () => {
    const client = new Client(API)
    const response = await client.fetch("/api/agents/sign-in-as", {
      method: "POST",
      headers: { origin: WEB },
    })
    try {
      expect(response.status).toBe(302)
      expect(response.headers.get("location")).toBe(`${WEB}/dashboard`)
      expect(client.cookies.size).toBeGreaterThan(0)
    } finally {
      await signOut(client)
    }
  })
})
