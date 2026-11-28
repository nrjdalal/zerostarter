import { expect, test } from "bun:test"
import { join } from "node:path"

const API = join(import.meta.dir, "../../../../../api/hono")

// Each case gets a limiter of its own with a limit of 2, so a third counted request from one client is refused. A peer is the address Bun.serve() reports for the connection, given to fetch as its env; Vercel's case has none, since the function sees only Vercel's proxy. Each answer is its status, and "skipped" when the limiter set no RateLimit-Limit header, which it sets only once it has stored the request's key.
const PROBE = `
import { Hono } from "hono"
import { createRateLimiter } from "./src/middlewares/rate-limiter"

type Ask = { headers?: Record<string, string>; peer?: string }
const app = () => new Hono().use(createRateLimiter({ limit: 2, windowMs: 60_000 })).get("/", (c) => c.text("ok"))
const stacked = () =>
  new Hono()
    .use(createRateLimiter({ limit: 1000, windowMs: 60_000 }))
    .use(createRateLimiter({ getUserId: (c) => c.req.header("x-user"), limit: 2, windowMs: 60_000 }))
    .get("/", (c) => c.text("ok"))
const env = (peer?: string) =>
  peer ? { requestIP: () => ({ address: peer, family: peer.includes(":") ? "IPv6" : "IPv4", port: 40000 }) } : undefined
const answer = (r: Response) => r.status + (r.headers.has("ratelimit-limit") ? "" : " skipped")
const answers = async (asks: Ask[], make = app) => {
  const one = make()
  const out: string[] = []
  for (const ask of asks) out.push(answer(await one.fetch(new Request("http://api.test/", { headers: ask.headers }), env(ask.peer))))
  return out
}
const cases = JSON.parse(process.env.CASES ?? "{}") as Record<string, Ask[]>
const stack = JSON.parse(process.env.STACKED ?? "{}") as Record<string, Ask[]>
const out: Record<string, string[]> = {}
for (const [name, asks] of Object.entries(cases)) out[name] = await answers(asks)
for (const [name, asks] of Object.entries(stack)) out[name] = await answers(asks, stacked)
if (process.env.LOOPBACK) {
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: app().fetch })
  const got: string[] = []
  for (let i = 0; i < 3; i++) got.push(answer(await fetch("http://127.0.0.1:" + server.port + "/")))
  server.stop(true)
  out["a loopback client over a real socket"] = got
}
console.log(JSON.stringify(out))
`

type Ask = { headers?: Record<string, string>; peer?: string }

const probe = async (cases: Record<string, Ask[]>, env: Record<string, string>) => {
  const proc = Bun.spawn([process.execPath, "-e", PROBE], {
    cwd: API,
    env: { ...process.env, CASES: JSON.stringify(cases), SKIP_ENV_VALIDATION: "true", ...env },
    stderr: "pipe",
    stdout: "pipe",
  })
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  expect(err).toBe("")
  expect(code).toBe(0)
  return JSON.parse(out) as Record<string, string[]>
}

const three = (ask: Ask) => [ask, ask, ask]
const rotating = (peer?: string) =>
  ["1.2.3.4", "5.6.7.8", "9.10.11.12"].map((ip) => ({ headers: { "x-forwarded-for": ip }, peer }))
const limited = ["200", "200", "429"]
const skipped = ["200 skipped", "200 skipped", "200 skipped"]

test("off Vercel, a public peer is keyed on its own address, so a forwarding header it sends cannot pick its bucket", async () => {
  expect(
    await probe({ "a public peer that rotates x-forwarded-for": rotating("8.8.8.8") }, {}),
  ).toEqual({
    "a public peer that rotates x-forwarded-for": limited,
  })
})

test("off Vercel, a private peer that forwards a public client address is keyed on that address", async () => {
  const behind = (ip: string) => ({ headers: { "x-forwarded-for": ip }, peer: "172.18.0.2" })
  expect(
    await probe(
      {
        "one public client behind a private proxy": three(behind("1.2.3.4")),
        "two public clients behind one private proxy": [
          behind("1.2.3.4"),
          behind("1.2.3.4"),
          behind("5.6.7.8"),
        ],
      },
      {},
    ),
  ).toEqual({
    "one public client behind a private proxy": limited,
    // each client keeps a bucket of its own, so one cannot spend another's
    "two public clients behind one private proxy": ["200", "200", "200"],
  })
})

test("off Vercel, a private or loopback peer that forwards no public client address skips the limit and stores no key", async () => {
  expect(
    await probe(
      {
        "a Docker peer with no forwarding header": three({ peer: "172.18.0.5" }),
        "a private-network peer with no forwarding header": three({ peer: "10.1.2.3" }),
        "a Docker peer that forwards a private address": three({
          headers: { "x-forwarded-for": "192.168.1.9" },
          peer: "172.18.0.5",
        }),
      },
      { LOOPBACK: "1" },
    ),
  ).toEqual({
    "a Docker peer with no forwarding header": skipped,
    "a private-network peer with no forwarding header": skipped,
    "a Docker peer that forwards a private address": skipped,
    "a loopback client over a real socket": skipped,
  })
})

test("off Vercel, an IPv4 client that Bun's dual-stack listener reports as ::ffff:a.b.c.d is read as that IPv4 address", async () => {
  expect(
    await probe(
      {
        "a mapped public peer that rotates x-forwarded-for": rotating("::ffff:8.8.8.8"),
        "a mapped public peer with no forwarding header": three({ peer: "::ffff:8.8.8.8" }),
        "a mapped private proxy's public client": three({
          headers: { "x-forwarded-for": "1.2.3.4" },
          peer: "::ffff:172.18.0.2",
        }),
        "a mapped Docker peer with no forwarding header": three({ peer: "::ffff:172.18.0.5" }),
      },
      {},
    ),
  ).toEqual({
    "a mapped public peer that rotates x-forwarded-for": limited,
    "a mapped public peer with no forwarding header": limited,
    "a mapped private proxy's public client": limited,
    "a mapped Docker peer with no forwarding header": skipped,
  })
})

test("behind the global limiter, the per-user limiter keys each signed-in user on their own account", async () => {
  const user = (id: string, peer: string) => ({ headers: { "x-user": id }, peer })
  expect(
    await probe(
      {},
      {
        STACKED: JSON.stringify({
          "two users behind one public address": [
            user("a", "8.8.8.8"),
            user("a", "8.8.8.8"),
            user("b", "8.8.8.8"),
          ],
          "one user from three public addresses": [
            user("a", "8.8.8.8"),
            user("a", "8.8.4.4"),
            user("a", "1.1.1.1"),
          ],
          "one user on an internal peer": three(user("a", "172.18.0.5")),
        }),
      },
    ),
  ).toEqual({
    "two users behind one public address": ["200", "200", "200"],
    "one user from three public addresses": limited,
    "one user on an internal peer": limited,
  })
})

test("on Vercel, a client is keyed on the x-real-ip Vercel sets, whatever x-forwarded-for it sends", async () => {
  const real = (ip: string, forwarded = "9.9.9.9") => ({
    headers: { "x-forwarded-for": forwarded, "x-real-ip": ip },
  })
  expect(
    await probe(
      {
        "one client that rotates x-forwarded-for": rotating().map((ask) => ({
          headers: { ...ask.headers, "x-real-ip": "1.2.3.4" },
        })),
        "two clients": [real("1.2.3.4"), real("1.2.3.4"), real("5.6.7.8")],
      },
      { VERCEL: "1" },
    ),
  ).toEqual({
    "one client that rotates x-forwarded-for": limited,
    "two clients": ["200", "200", "200"],
  })
})
