import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import {
  AGENT_EMAIL,
  API,
  Client,
  enabled,
  normalize,
  signInAsAgent,
  signOut,
} from "../../../../stack"

// The signed-in reads in api/hono/src/routers/v1.ts on a running stack: an anonymous caller is refused with the envelope, and the agent reads its session and its user back with exactly the documented fields. Golden after normalize(). Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

describe.skipIf(!enabled)("api/hono/src/routers/v1.ts", () => {
  let agent: Client

  beforeAll(async () => {
    agent = await signInAsAgent()
  })

  afterAll(async () => {
    await signOut(agent)
  })

  test("an anonymous caller is refused", async () => {
    const { status, body } = await new Client(API).json("/api/v1/user")
    expect(status).toBe(401)
    expect(body).toMatchSnapshot()
  })

  test("the session and the user read back as documented", async () => {
    const session = await agent.json("/api/v1/session")
    const user = await agent.json<{ data: { email: string } }>("/api/v1/user")
    expect(session.status).toBe(200)
    expect(user.status).toBe(200)
    expect(user.body.data.email).toBe(AGENT_EMAIL)
    expect(normalize({ session: session.body, user: user.body })).toMatchSnapshot()
  })
})
