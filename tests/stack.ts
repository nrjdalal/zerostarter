// The running stack this suite drives, named by env so the same tests run against docker compose, the dev stack, or any other deployment that mounts the agent sign-in route. Nothing here imports app source: the suite tests the artifact that is serving, not the code that built it.
export const API = process.env.E2E_API_URL ?? ""
export const WEB = process.env.E2E_WEB_URL ?? ""
export const POSTGRES_URL = process.env.E2E_POSTGRES_URL ?? ""
// The Origin the agent sign-in and every Better Auth write must carry; the web URL is a trusted origin by construction.
export const ORIGIN = process.env.E2E_ORIGIN ?? WEB
export const enabled = API !== "" && WEB !== ""

export const AGENT_EMAIL = "agent@local.host"
export const SEEDED_EMAIL = "golden.seed@example.com"
export const SEEDED_ID = "golden-seed-user"

// A cookie jar just wide enough for one signed-in agent: keeps every cookie the server sets and replays them, dropping the ones it clears.
export class Client {
  readonly cookies = new Map<string, string>()

  constructor(readonly base: string) {}

  cookieHeader(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ")
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    if (this.cookies.size > 0) headers.set("cookie", this.cookieHeader())
    const response = await fetch(`${this.base}${path}`, { ...init, headers, redirect: "manual" })
    for (const raw of response.headers.getSetCookie()) {
      const [pair, ...attributes] = raw.split(";")
      const eq = pair.indexOf("=")
      const name = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      const cleared = attributes.some((a) => /^\s*max-age=0$/i.test(a)) || value === ""
      if (cleared) this.cookies.delete(name)
      else this.cookies.set(name, value)
    }
    return response
  }

  async json<T = unknown>(
    path: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: T }> {
    const response = await this.fetch(path, init)
    return { status: response.status, body: (await response.json()) as T }
  }

  // Every write carries the trusted Origin, which Better Auth checks on state-changing requests and the agent route requires outright.
  send<T = unknown>(method: string, path: string, body?: unknown) {
    return this.json<T>(path, {
      method,
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }
}

// Sign in as LocalAgent through the local-only route and answer with a client that carries the session.
export const signInAsAgent = async (): Promise<Client> => {
  const client = new Client(API)
  const response = await client.fetch("/api/agents/sign-in-as", {
    method: "POST",
    headers: { origin: ORIGIN },
  })
  if (response.status !== 302) {
    throw new Error(`agent sign-in answered ${response.status}: ${await response.text()}`)
  }
  return client
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const BETTER_AUTH_ID = /^[A-Za-z0-9]{32}$/
const BUILD_VERSION = /^\d+\.\d+\.\d+(-[0-9a-f]{7,40})?$/
// Fields whose value depends on the run, the machine, or the clock, and never on the contract.
const VOLATILE_KEYS = new Set([
  "environment",
  "expiresAt",
  "ipAddress",
  "lastActive",
  "token",
  "userAgent",
])

// Replace every run-dependent value with a placeholder so a snapshot captures the shape and the stable content, and nothing else.
export const normalize = (value: unknown, key = ""): unknown => {
  if (Array.isArray(value)) return value.map((item) => normalize(item))
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalize(v, k)]),
    )
  }
  if (VOLATILE_KEYS.has(key) && value !== null && value !== undefined) return `<${key}>`
  if (typeof value === "string") {
    if (ISO_TIMESTAMP.test(value)) return "<timestamp>"
    if (UUID.test(value)) return "<uuid>"
    if (BUILD_VERSION.test(value)) return "<version>"
    if (BETTER_AUTH_ID.test(value)) return "<id>"
  }
  return value
}

// Seed rows the API offers no route for (a second user), only when the run names the database. Fake rows, fixed ids, removed again at the end.
export const seedUser = async (): Promise<void> => {
  const sql = new Bun.SQL(POSTGRES_URL)
  await sql`delete from "user" where email = ${SEEDED_EMAIL}`
  await sql`insert into "user" (id, name, email, email_verified, created_at, updated_at, role) values (${SEEDED_ID}, ${"Golden Seed"}, ${SEEDED_EMAIL}, true, now() - interval '1 day', now() - interval '1 day', ${"user"})`
  await sql.end()
}

export const removeSeededUser = async (): Promise<void> => {
  const sql = new Bun.SQL(POSTGRES_URL)
  await sql`delete from "user" where email = ${SEEDED_EMAIL}`
  await sql.end()
}
