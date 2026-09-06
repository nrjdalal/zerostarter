import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import {
  AGENT_EMAIL,
  Client,
  enabled,
  normalize,
  POSTGRES_URL,
  removeSeededUser,
  SEEDED_EMAIL,
  SEEDED_ID,
  seedUser,
  signInAsAgent,
} from "../../../../stack"

// The console routes in api/hono/src/routers/admin.ts on a running stack, as the owner: the users list, the refusal to change one's own role, a seeded account promoted then banned and unbanned (only when E2E_POSTGRES_URL names the database, since no route creates a user), the activity those writes leave, and the allowlist and waitlist as the console sees them. Golden after normalize(). The users list assumes a fresh database where LocalAgent is the only account. Re-runnable: rows a dead run left are removed first. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

type Outcome = { id: string; ok: boolean; code?: string; message?: string }
type Batch = { data: { results: Outcome[] } }
type Users = { data: { users: { banned: boolean; email: string; id: string; role: string }[] } }
type Activity = { data: { events: unknown[]; total: number } }
type Rules = { data: { rules: { id: string; value: string }[] } }
type Signups = { data: { signups: { email: string; id: string }[] } }

const ALLOWLIST_VALUE = "golden.allow@example.com"
const WAITLIST_EMAIL = "golden.wait@example.com"

describe.skipIf(!enabled)("api/hono/src/routers/admin.ts", () => {
  let agent: Client
  let agentId = ""
  let activityBefore = 0

  const staleRules = async () => {
    const { body } = await agent.json<Rules>("/api/v1/admin/allowlist?perPage=100")
    return body.data.rules.filter((row) => row.value === ALLOWLIST_VALUE).map((row) => row.id)
  }

  const staleSignups = async () => {
    const { body } = await agent.json<Signups>("/api/v1/admin/waitlist?perPage=100")
    return body.data.signups.filter((row) => row.email === WAITLIST_EMAIL).map((row) => row.id)
  }

  beforeAll(async () => {
    agent = await signInAsAgent()
    const user = await agent.json<{ data: { id: string } }>("/api/v1/user")
    agentId = user.body.data.id
    const rules = await staleRules()
    if (rules.length > 0) await agent.send("DELETE", "/api/v1/admin/allowlist", { ids: rules })
    const signups = await staleSignups()
    if (signups.length > 0) await agent.send("DELETE", "/api/v1/admin/waitlist", { ids: signups })
    if (POSTGRES_URL) await removeSeededUser()
  })

  afterAll(async () => {
    if (POSTGRES_URL) await removeSeededUser()
  })

  test("the users list holds every account, the agent as owner", async () => {
    const { status, body } = await agent.json<Users>("/api/v1/admin/users")
    expect(status).toBe(200)
    const me = body.data.users.find((u) => u.email === AGENT_EMAIL)
    expect(me && me.role).toBe("owner")
    expect(normalize(body)).toMatchSnapshot()
  })

  test("an owner cannot change its own role", async () => {
    const { status, body } = await agent.send<Batch>("PATCH", "/api/v1/admin/users/role", {
      ids: [agentId],
      role: "member",
    })
    expect(status).toBe(200)
    expect(body.data.results[0].ok).toBe(false)
    expect(normalize(body)).toMatchSnapshot()
  })

  test.skipIf(!POSTGRES_URL)("a seeded account is promoted, banned, and unbanned", async () => {
    await seedUser()
    const before = await agent.json<Activity>("/api/v1/admin/activity")
    activityBefore = before.body.data.total
    const promoted = await agent.send<Batch>("PATCH", "/api/v1/admin/users/role", {
      ids: [SEEDED_ID],
      role: "member",
    })
    const banned = await agent.send<Batch>("PATCH", "/api/v1/admin/users/status", {
      ids: [SEEDED_ID],
      banned: true,
    })
    const listed = await agent.json<Users>("/api/v1/admin/users")
    const seeded = listed.body.data.users.find((u) => u.email === SEEDED_EMAIL)
    expect(seeded && seeded.role).toBe("member")
    expect(seeded && seeded.banned).toBe(true)
    const unbanned = await agent.send<Batch>("PATCH", "/api/v1/admin/users/status", {
      ids: [SEEDED_ID],
      banned: false,
    })
    expect(
      normalize({ promoted: promoted.body, banned: banned.body, unbanned: unbanned.body }),
    ).toMatchSnapshot()
  })

  test.skipIf(!POSTGRES_URL)("the activity log records those writes, newest first", async () => {
    const { status, body } = await agent.json<Activity>("/api/v1/admin/activity")
    expect(status).toBe(200)
    const fresh = body.data.events.slice(0, body.data.total - activityBefore)
    expect(fresh.length).toBe(3)
    expect(normalize(fresh)).toMatchSnapshot()
  })

  test("the allowlist takes a value, lists it, and removes it", async () => {
    const added = await agent.send("POST", "/api/v1/admin/allowlist", { value: ALLOWLIST_VALUE })
    expect(added.status).toBe(200)
    const ids = await staleRules()
    expect(ids.length).toBe(1)
    const removed = await agent.send<Batch>("DELETE", "/api/v1/admin/allowlist", { ids })
    expect(removed.status).toBe(200)
    expect(normalize({ added: added.body, removed: removed.body })).toMatchSnapshot()
  })

  test("the waitlist lists a signup and removes it", async () => {
    const joined = await new Client(agent.base).send("POST", "/api/waitlist", {
      email: WAITLIST_EMAIL,
    })
    expect(joined.status).toBe(200)
    const ids = await staleSignups()
    expect(ids.length).toBe(1)
    const removed = await agent.send<Batch>("DELETE", "/api/v1/admin/waitlist", { ids })
    expect(removed.status).toBe(200)
    expect(normalize(removed.body)).toMatchSnapshot()
  })
})
