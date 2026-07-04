import { expect, test } from "@playwright/test"

import { expectErrorEnvelope } from "@/helpers"
import { SITE } from "@/surface"
import { API_URL, TRUSTED_ORIGIN, UNTRUSTED_ORIGIN, WEB_URL } from "@/urls"

test.describe("POST /api/agents/sign-in-as (local-only dev sign-in)", () => {
  test("rejects a missing Origin header", async ({ request }) => {
    const res = await request.post(`${API_URL}/api/agents/sign-in-as`)
    await expectErrorEnvelope(res, 500, "AGENT_LOGIN_FAILED", "missing Origin header")
  })

  test("rejects an untrusted Origin", async ({ request }) => {
    const res = await request.post(`${API_URL}/api/agents/sign-in-as`, {
      headers: { origin: UNTRUSTED_ORIGIN },
    })
    await expectErrorEnvelope(res, 500, "AGENT_LOGIN_FAILED", "untrusted Origin")
  })

  test("a trusted Origin gets a session cookie and a redirect to the dashboard", async ({
    request,
  }) => {
    const res = await request.post(`${API_URL}/api/agents/sign-in-as`, {
      headers: { origin: TRUSTED_ORIGIN },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(302)
    expect(res.headers()["location"]).toBe(`${WEB_URL}/dashboard`)

    const setCookie = res.headers()["set-cookie"]
    expect(setCookie).toContain("session_token")
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("Path=/")
    expect(setCookie).toContain("SameSite=Lax")
  })

  test("the issued session authenticates as the admin agent", async ({ request }) => {
    const signIn = await request.post(`${API_URL}/api/agents/sign-in-as`, {
      headers: { origin: TRUSTED_ORIGIN },
      maxRedirects: 0,
    })
    const cookie = signIn.headers()["set-cookie"].split(";")[0]

    const res = await request.get(`${API_URL}/api/v1/user`, { headers: { cookie } })
    expect(res.status()).toBe(200)
    const { data } = await res.json()
    expect(data.name).toBe(SITE.agent.name)
    expect(data.email).toBe(SITE.agent.email)
    expect(data.emailVerified).toBe(true)
    expect(data.role).toBe("admin")
  })

  test("GET is not a matched method", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/agents/sign-in-as`)
    await expectErrorEnvelope(res, 404, "NOT_FOUND", "Not Found")
  })
})
