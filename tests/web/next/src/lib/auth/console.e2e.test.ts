import { describe, expect, test } from "bun:test"

import { Client, enabled, signInAsAgent, WEB } from "../../../../../stack"

// The console gate in web/next/src/lib/auth/console.ts on a running stack: below the rung the console does not exist (a 404, never a redirect, so it is never advertised), and the agent, an owner, gets the users page. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("web/next/src/lib/auth/console.ts", () => {
  test("the console does not exist for an anonymous visitor", async () => {
    const response = await new Client(WEB).fetch("/console/users")
    expect(response.status).toBe(404)
  })

  test("the owner gets the users page", async () => {
    const agent = await signInAsAgent()
    const response = await fetch(`${WEB}/console/users`, {
      headers: { cookie: agent.cookieHeader() },
      redirect: "manual",
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("Users")
  })
})
