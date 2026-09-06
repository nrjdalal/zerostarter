import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { API, Client, enabled, normalize, signInAsAgent, signOut } from "../../../../stack"

// Better Auth as mounted by api/hono/src/routers/auth.ts on a running stack: the router's own providers list and session read, then the organization plugin's own endpoints: an organization is created, made active, and read back whole; a team counts its seats as a member comes and goes (the member_count and membership_key columns 1.7 added); and the organization is deleted with its team. Golden after normalize(). Re-runnable: a golden-org left by a run that died is removed first, and the session is ended at the end. Skipped unless E2E_API_URL and E2E_WEB_URL name a stack (bun run test:e2e).

type Organization = {
  id: string
  slug: string
  teams: { id: string; memberCount: number; name: string }[]
}

const ORG_SLUG = "golden-org"

describe.skipIf(!enabled)("api/hono/src/routers/auth.ts", () => {
  const anonymous = new Client(API)
  let agent: Client
  let agentId = ""
  let organizationId = ""
  let teamId = ""

  const fullOrganization = async () => {
    const { body } = await agent.json<Organization>(
      `/api/auth/organization/get-full-organization?organizationId=${organizationId}`,
    )
    return body
  }

  beforeAll(async () => {
    agent = await signInAsAgent()
    const user = await agent.json<{ data: { id: string } }>("/api/v1/user")
    agentId = user.body.data.id
    const { body: organizations } = await agent.json<{ id: string; slug: string }[]>(
      "/api/auth/organization/list",
    )
    for (const org of organizations) {
      if (org.slug === ORG_SLUG) {
        await agent.send("POST", "/api/auth/organization/delete", { organizationId: org.id })
      }
    }
  })

  afterAll(async () => {
    if (organizationId) {
      await agent.send("POST", "/api/auth/organization/delete", { organizationId })
    }
    await signOut(agent)
  })

  test("better auth answers ok", async () => {
    const { status, body } = await anonymous.json("/api/auth/ok")
    expect(status).toBe(200)
    expect(body).toEqual({ ok: true })
  })

  test("the providers list names the agent on a local stage", async () => {
    const { status, body } = await anonymous.json<{ data: { providers: string[] } }>(
      "/api/auth/providers",
    )
    expect(status).toBe(200)
    expect(body.data.providers).toContain("agent")
    expect(body).toMatchSnapshot()
  })

  test("the session read is empty for a visitor and whole for the agent", async () => {
    const visitor = await anonymous.json("/api/auth/get-session")
    const signedIn = await agent.json("/api/auth/get-session")
    expect(visitor.status).toBe(200)
    expect(visitor.body).toBeNull()
    expect(signedIn.status).toBe(200)
    expect(normalize(signedIn.body)).toMatchSnapshot()
  })

  test("an organization is created, made active, and read back whole", async () => {
    const created = await agent.send<{ id: string; slug: string }>(
      "POST",
      "/api/auth/organization/create",
      { name: "Golden Org", slug: ORG_SLUG },
    )
    expect(created.status).toBe(200)
    organizationId = created.body.id
    const active = await agent.send("POST", "/api/auth/organization/set-active", {
      organizationId,
    })
    expect(active.status).toBe(200)
    const full = await fullOrganization()
    expect(full.slug).toBe(ORG_SLUG)
    expect(normalize(full)).toMatchSnapshot()
  })

  test("a team counts its seats as a member comes and goes", async () => {
    const created = await agent.send<{ id: string }>("POST", "/api/auth/organization/create-team", {
      name: "Golden Team",
      organizationId,
    })
    expect(created.status).toBe(200)
    teamId = created.body.id
    const seats = async () => {
      const team = (await fullOrganization()).teams.find((t) => t.id === teamId)
      return team ? team.memberCount : -1
    }
    expect(await seats()).toBe(0)
    const added = await agent.send("POST", "/api/auth/organization/add-team-member", {
      teamId,
      userId: agentId,
    })
    expect(added.status).toBe(200)
    expect(await seats()).toBe(1)
    const removed = await agent.send("POST", "/api/auth/organization/remove-team-member", {
      teamId,
      userId: agentId,
    })
    expect(removed.status).toBe(200)
    expect(await seats()).toBe(0)
    expect(normalize({ added: added.body, removed: removed.body })).toMatchSnapshot()
  })

  test("the organization is deleted with its team", async () => {
    const deleted = await agent.send("POST", "/api/auth/organization/delete", { organizationId })
    expect(deleted.status).toBe(200)
    organizationId = ""
    const { body: organizations } = await agent.json<{ slug: string }[]>(
      "/api/auth/organization/list",
    )
    expect(organizations.some((o) => o.slug === ORG_SLUG)).toBe(false)
  })
})
