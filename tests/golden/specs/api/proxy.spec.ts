import { expect, test } from "@playwright/test"

import { agentCookie } from "@/helpers"
import { SITE } from "@/surface"
import { API_URL, WEB_URL } from "@/urls"

// The web app rewrites /api/* to the Hono API, so the whole API is reachable same-origin. The frontend relies on this for credentialed calls; a migration must preserve it.
test.describe("web /api/* proxy to the API", () => {
  test("GET /api/health through the web origin matches the direct API response", async ({
    request,
  }) => {
    const direct = await (await request.get(`${API_URL}/api/health`)).json()
    const proxied = await request.get(`${WEB_URL}/api/health`)
    expect(proxied.status()).toBe(200)
    expect(await proxied.json()).toEqual(direct)
  })

  test("errors keep their envelope through the proxy", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/api/definitely-not-a-route`)
    expect(res.status()).toBe(404)
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Not Found" } })
  })

  test("authenticated calls work same-origin through the proxy", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/api/v1/user`, {
      headers: { cookie: agentCookie() },
    })
    expect(res.status()).toBe(200)
    expect((await res.json()).data.email).toBe(SITE.agent.email)
  })

  test("POST bodies pass through the proxy", async ({ request }) => {
    const res = await request.post(`${WEB_URL}/api/waitlist`, {
      headers: { "content-type": "application/json" },
      data: { email: "not-an-email" },
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR")
  })
})
