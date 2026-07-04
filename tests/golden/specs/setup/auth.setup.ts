import { expect, test as setup } from "@playwright/test"

import { saveAgentCookie, signInAsAgent, STORAGE_STATE } from "@/helpers"
import { API_URL, WEB_URL } from "@/urls"

// Readiness + shared auth: waits for both servers, signs in the local agent once, and persists the session for every project (cookie file for request specs, storageState for browser specs).
setup("stack is up and agent session is saved", async ({ request, browser }) => {
  await expect(async () => {
    const health = await request.get(`${API_URL}/api/health`)
    expect(health.ok()).toBe(true)
  }).toPass({ timeout: 120_000 })

  await expect(async () => {
    const home = await request.get(WEB_URL)
    expect(home.ok()).toBe(true)
  }).toPass({ timeout: 120_000 })

  const cookie = await signInAsAgent(request)
  saveAgentCookie(cookie)

  const eq = cookie.indexOf("=")
  const name = cookie.slice(0, eq)
  const value = cookie.slice(eq + 1)
  const context = await browser.newContext()
  await context.addCookies([
    { name, value, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ])
  await context.storageState({ path: STORAGE_STATE })
  await context.close()
})
