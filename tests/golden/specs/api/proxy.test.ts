import { describe, expect, test } from "bun:test"

import { agentCookie } from "@/http"
import { SITE } from "@/surface"
import { API_URL, WEB_URL } from "@/urls"

// The web app rewrites /api/* to the Hono API, so the whole API is reachable same-origin. The frontend relies on this for credentialed calls; a migration must preserve it.
describe("web /api/* proxy to the API", () => {
  test("GET /api/health through the web origin matches the direct API response", async () => {
    const direct = await (await fetch(`${API_URL}/api/health`)).json()
    const proxied = await fetch(`${WEB_URL}/api/health`)
    expect(proxied.status).toBe(200)
    expect(await proxied.json()).toEqual(direct)
  })

  test("errors keep their envelope through the proxy", async () => {
    const res = await fetch(`${WEB_URL}/api/definitely-not-a-route`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Not Found" } })
  })

  test("authenticated calls work same-origin through the proxy", async () => {
    const res = await fetch(`${WEB_URL}/api/v1/user`, {
      headers: { cookie: await agentCookie() },
    })
    expect(res.status).toBe(200)
    expect((await res.json()).data.email).toBe(SITE.agent.email)
  })

  test("POST bodies pass through the proxy", async () => {
    const res = await fetch(`${WEB_URL}/api/waitlist`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR")
  })
})
