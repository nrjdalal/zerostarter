import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { API, Client, enabled, withAgent } from "../../../../stack"

// The public waitlist in api/hono/src/routers/waitlist.ts on a running stack: the count, a join, and what a second join of the same address answers. Golden. A signup left by an interrupted run is removed first, so the first join is a real insert, and the row is removed through the console afterwards so the run leaves nothing behind.

const EMAIL = "golden.join@example.com"

describe.skipIf(!enabled)("api/hono/src/routers/waitlist.ts", () => {
  const visitor = new Client(API)

  const removeSignup = async () => {
    await withAgent(async (agent) => {
      const { body } = await agent.json<{ data: { signups: { email: string; id: string }[] } }>(
        "/api/v1/admin/waitlist?perPage=100",
      )
      const ids = body.data.signups.filter((row) => row.email === EMAIL).map((row) => row.id)
      if (ids.length > 0) await agent.send("DELETE", "/api/v1/admin/waitlist", { ids })
    })
  }

  beforeAll(removeSignup)

  afterAll(removeSignup)

  test("the count is public", async () => {
    const { status, body } = await visitor.json<{ data: { count: number } }>("/api/waitlist")
    expect(status).toBe(200)
    expect(typeof body.data.count).toBe("number")
  })

  test("a join is accepted once and answered the same way twice", async () => {
    const first = await visitor.send("POST", "/api/waitlist", { email: EMAIL })
    const second = await visitor.send("POST", "/api/waitlist", { email: EMAIL })
    expect(first.status).toBe(200)
    expect({
      first: first.body,
      second: { body: second.body, status: second.status },
    }).toMatchSnapshot()
  })

  test("a malformed address is refused with the envelope", async () => {
    const { status, body } = await visitor.send("POST", "/api/waitlist", { email: "not-an-email" })
    expect(status).toBe(400)
    expect(body).toMatchSnapshot()
  })
})
