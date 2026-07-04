import { describe, expect, test } from "bun:test"

import { agentCookie, signInAsAgent } from "@/http"
import { AUTH_PROVIDERS, SITE } from "@/surface"
import { API_URL, TRUSTED_ORIGIN, WEB_URL } from "@/urls"

describe("Better Auth surface (/api/auth)", () => {
  test("GET /api/auth/providers lists exactly the enabled providers", async () => {
    const res = await fetch(`${API_URL}/api/auth/providers`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { providers: [...AUTH_PROVIDERS] } })
  })

  test("GET /api/auth/get-session is null for anonymous requests", async () => {
    const res = await fetch(`${API_URL}/api/auth/get-session`)
    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })

  test("GET /api/auth/get-session returns session and user when authenticated", async () => {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie: await agentCookie() },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.email).toBe(SITE.agent.email)
    expect(body.session.userId).toBe(body.user.id)
    expect(new Date(body.session.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  test("POST /api/auth/sign-in/social returns the GitHub authorize URL", async () => {
    const res = await fetch(`${API_URL}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { origin: TRUSTED_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ provider: "github", callbackURL: `${WEB_URL}/dashboard` }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.redirect).toBe(true)
    expect(body.url).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?/)
  })

  test("POST /api/auth/sign-in/social returns the Google authorize URL", async () => {
    const res = await fetch(`${API_URL}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { origin: TRUSTED_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ provider: "google", callbackURL: `${WEB_URL}/dashboard` }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.redirect).toBe(true)
    expect(body.url).toMatch(/^https:\/\/accounts\.google\.com\//)
  })

  test("POST /api/auth/sign-out invalidates the session", async () => {
    // A dedicated session, so signing out does not break the shared agent cookie other tests use.
    const cookie = await signInAsAgent()

    const signOut = await fetch(`${API_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: { origin: TRUSTED_ORIGIN, cookie, "content-type": "application/json" },
      body: "{}",
    })
    expect(signOut.status).toBe(200)
    expect((await signOut.json()).success).toBe(true)

    const after = await fetch(`${API_URL}/api/auth/get-session`, { headers: { cookie } })
    expect(await after.json()).toBeNull()
  })

  test("credentialed POSTs without a trusted Origin are rejected (CSRF)", async () => {
    const res = await fetch(`${API_URL}/api/auth/organization/create`, {
      method: "POST",
      headers: { cookie: await agentCookie(), "content-type": "application/json" },
      body: JSON.stringify({ name: "CSRF Probe", slug: "csrf-probe" }),
    })
    expect(res.status).toBe(403)
  })

  test("GET /api/auth/reference serves the Better Auth API reference", async () => {
    const res = await fetch(`${API_URL}/api/auth/reference`)
    expect(res.status).toBe(200)
  })

  test("unknown auth subroutes are 404", async () => {
    const res = await fetch(`${API_URL}/api/auth/definitely-not-a-route`)
    expect(res.status).toBe(404)
  })
})
