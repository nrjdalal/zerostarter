// The running stack this suite drives, named by env so the same tests run against docker compose, the dev stack, or any other local-stage deployment, which is the only kind that mounts the agent sign-in the suite signs in with. Nothing here imports app source: the suite tests the artifact that is serving, not the code that built it.
export const API = process.env.E2E_API_URL ?? ""
export const POSTGRES_URL = process.env.E2E_POSTGRES_URL ?? ""
export const WEB = process.env.E2E_WEB_URL ?? ""
// Every suite file guards itself with describe.skipIf(!enabled); bun run test:e2e is what names a stack.
export const enabled = API !== "" && WEB !== ""

export const AGENT_EMAIL = "agent@local.host"
export const SEEDED_EMAIL = "golden.seed@example.com"
export const SEEDED_ID = "golden-seed-user"

// A cookie jar just wide enough for one signed-in agent: keeps every cookie the server sets and replays them, dropping the ones it clears. A path is resolved against the base; an absolute URL is fetched as given, which is how the web app is reached with the API's session.
export class Client {
  readonly cookies = new Map<string, string>()

  constructor(readonly base: string) {}

  async fetch(target: string, init: RequestInit = {}): Promise<Response> {
    const url = target.startsWith("http") ? target : `${this.base}${target}`
    const headers = new Headers(init.headers)
    if (this.cookies.size > 0) {
      headers.set("cookie", [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "))
    }
    const response = await fetch(url, { ...init, headers, redirect: "manual" })
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
    target: string,
    init: RequestInit = {},
  ): Promise<{ status: number; body: T }> {
    const response = await this.fetch(target, init)
    return { body: (await response.json()) as T, status: response.status }
  }

  // Every write carries the web URL as its Origin, which Better Auth checks on state-changing requests and the agent route requires outright; the web URL is a trusted origin by construction.
  send<T = unknown>(method: string, target: string, body?: unknown) {
    return this.json<T>(target, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { "content-type": "application/json", origin: WEB },
      method,
    })
  }
}

// Sign in as LocalAgent through the local-only route and answer with a client that carries the session.
export const signInAsAgent = async (): Promise<Client> => {
  const client = new Client(API)
  const response = await client.fetch("/api/agents/sign-in-as", {
    method: "POST",
    headers: { origin: WEB },
  })
  if (response.status !== 302) {
    throw new Error(`agent sign-in answered ${response.status}: ${await response.text()}`)
  }
  return client
}

// End the session a sign-in minted, so a run leaves no session rows behind.
export const signOut = async (client: Client): Promise<void> => {
  const { status } = await client.send("POST", "/api/auth/sign-out")
  if (status !== 200) throw new Error(`sign-out answered ${status}`)
}

// Run one step as the signed-in agent and end the session whatever the step does.
export const withAgent = async (step: (agent: Client) => Promise<void>): Promise<void> => {
  const agent = await signInAsAgent()
  try {
    await step(agent)
  } finally {
    await signOut(agent)
  }
}

const BETTER_AUTH_ID = /^[A-Za-z0-9]{32}$/
const BUILD_VERSION = /^\d+\.\d+\.\d+(-[0-9a-f]{7,40})?$/
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// Fields whose value depends on the run, the machine, the clock, or the build, and never on the contract. The placeholder keeps the type, so a field that changes type still fails.
const VOLATILE_KEYS = new Set([
  "expiresAt",
  "ipAddress",
  "lastActive",
  "token",
  "userAgent",
  "version",
])

// Replace every run-dependent value with a placeholder so a snapshot captures the shape and the stable content, and nothing else.
export const normalize = (value: unknown, key = ""): unknown => {
  if (Array.isArray(value)) return value.map((item) => normalize(item))
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalize(v, k)]),
    )
  }
  if (VOLATILE_KEYS.has(key) && value !== null && value !== undefined) {
    return `<${key}:${typeof value}>`
  }
  // The OpenAPI document quotes the build version as an example, under a key that is not volatile anywhere else.
  if (key === "example" && typeof value === "string" && BUILD_VERSION.test(value))
    return "<version:string>"
  if (typeof value === "string") {
    if (ISO_TIMESTAMP.test(value)) return "<timestamp>"
    if (UUID.test(value)) return "<uuid>"
    if (BETTER_AUTH_ID.test(value)) return "<id>"
  }
  return value
}

// Seeding writes straight into the database, so it runs only against a disposable one: on this machine, and holding no account but the agent and the seed. A populated database is someone's data, whatever host it answers on.
const LOCAL_HOSTS = new Set(["127.0.0.1", "[::1]", "host.docker.internal", "localhost"])

const openDisposable = async (): Promise<Bun.SQL> => {
  const host = new URL(POSTGRES_URL).hostname
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `E2E_POSTGRES_URL points at ${host}; seeding runs only against a local disposable database`,
    )
  }
  const sql = new Bun.SQL(POSTGRES_URL)
  const [other] =
    await sql`select email from "user" where email not in (${AGENT_EMAIL}, ${SEEDED_EMAIL}) limit 1`
  if (other) {
    await sql.end()
    throw new Error(
      "E2E_POSTGRES_URL holds accounts beyond the agent and the seed; seeding runs only against a fresh disposable database",
    )
  }
  return sql
}

// Seed rows the API offers no route for (a second user), only when the run names the database. Fake rows, fixed ids, removed again at the end.
export const seedUser = async (): Promise<void> => {
  const sql = await openDisposable()
  await sql`delete from "user" where email = ${SEEDED_EMAIL}`
  await sql`insert into "user" (id, name, email, email_verified, created_at, updated_at, role) values (${SEEDED_ID}, ${"Golden Seed"}, ${SEEDED_EMAIL}, true, now() - interval '1 day', now() - interval '1 day', ${"user"})`
  await sql.end()
}

export const removeSeededUser = async (): Promise<void> => {
  const sql = await openDisposable()
  await sql`delete from "user" where email = ${SEEDED_EMAIL}`
  await sql.end()
}
