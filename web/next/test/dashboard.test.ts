/**
 * Dashboard SSR behaviors with a real agent session: authed render markers,
 * the sidebar_state cookie contract, and session passthrough via the proxy.
 */
import { beforeAll, describe, expect, test } from "bun:test"

import { DEFAULT_TITLE, get, ROBOTS_HEADER, signInAsAgent } from "./helpers"

let cookie = ""

beforeAll(async () => {
  cookie = await signInAsAgent()
  expect(cookie).toContain("better-auth.session_token")
  // hook timeout (setDefaultTimeout covers tests, not hooks); the agent
  // sign-in can be throttled under concurrent test-file load
}, 30_000)

describe("authed dashboard SSR", () => {
  test("renders user identity, version, and chrome", async () => {
    const res = await get("/dashboard", { headers: { cookie } })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain("AgentCafe")
    expect(html).toContain("agent@cafe.local")
    expect(html).toContain(">RC<")
    expect(html).toMatch(/v(<!-- -->)?\d+\.\d+\.\d+/)
    expect(html).toContain(">Documentation<")
    // "Log out" lives inside the closed dropdown portal: browser tier covers it
  })

  test("sidebar_state=false renders collapsed, absent renders expanded", async () => {
    const collapsed = await (
      await get("/dashboard", { headers: { cookie: `${cookie}; sidebar_state=false` } })
    ).text()
    expect(collapsed).toContain('data-state="collapsed"')

    const expanded = await (await get("/dashboard", { headers: { cookie } })).text()
    expect(expanded).toContain('data-state="expanded"')
  })

  test("authed get-session via proxy returns the agent user", async () => {
    const res = await get("/api/auth/get-session", { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { user: { email: string } }
    expect(body.user.email).toBe("agent@cafe.local")
  })

  test("authed /api/v1/user via proxy returns the user envelope", async () => {
    const res = await get("/api/v1/user", { headers: { cookie } })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { name: string } }
    expect(body.data.name).toBe("AgentCafe")
  })
})

// --- coverage gap-fill: dashboard head, explicit-true cookie, version source ---

describe("dashboard gap-fill", () => {
  test("authed dashboard uses the default root title and carries the robots header", async () => {
    const res = await get("/dashboard", { headers: { cookie } })
    expect(res.status).toBe(200)
    expect(res.headers.get("x-robots-tag")).toBe(ROBOTS_HEADER)
    const title = (await res.text()).match(/<title>(.*?)<\/title>/)?.[1]
    expect(title).toBe(DEFAULT_TITLE)
  })

  test("sidebar_state=true renders expanded", async () => {
    const html = await (
      await get("/dashboard", { headers: { cookie: `${cookie}; sidebar_state=true` } })
    ).text()
    expect(html).toContain('data-state="expanded"')
  })

  test("docs footer and dashboard render the same version string", async () => {
    const ver = (html: string) => html.match(/v(?:<!-- -->)?(\d+\.\d+\.\d+[^\s"<]*)/)?.[1]
    const docsVer = ver(await (await get("/docs")).text())
    const dashVer = ver(await (await get("/dashboard", { headers: { cookie } })).text())
    expect(docsVer).toBeDefined()
    expect(dashVer).toBe(docsVer)
  })
})
