import { expect, test } from "bun:test"
import { join } from "node:path"

const API = join(import.meta.dir, "../../../../../api/hono")

// Run with bun -e from api/hono, which holds hono, since the limiter reads VERCEL once as it loads. Each case gets a limiter of its own with a limit of 2, so a third counted request from one client is refused. A peer is the address Bun.serve() reports for the connection; Vercel's case has none, since the function sees only Vercel's proxy. Each answer is its status, and "skipped" when the limiter set no RateLimit-Limit header, which it sets only once it has stored the request's key.
const PROBE = `
import { Hono } from "hono"

import { createRateLimiter } from "./src/middlewares/rate-limiter"

type Ask = { headers?: Record<string, string>; peer?: string }

const ok = (app: Hono) => app.get("/", (c) => c.text("ok"))
const single = () => ok(new Hono().use(createRateLimiter({ limit: 2, windowMs: 60_000 })))
// The global limiter, then the per-user one, as index.ts and auth.ts stack them.
const stacked = () =>
  ok(
    new Hono()
      .use(createRateLimiter({ limit: 1000, windowMs: 60_000 }))
      .use(
        createRateLimiter({ getUserId: (c) => c.req.header("x-user"), limit: 2, windowMs: 60_000 }),
      ),
  )

// A stub of the server Bun.serve() passes fetch as env, whose requestIP reports the peer.
const env = (peer?: string) =>
  peer
    ? {
        requestIP: () => ({
          address: peer,
          family: peer.includes(":") ? "IPv6" : "IPv4",
          port: 40000,
        }),
      }
    : undefined

const answer = (r: Response) => r.status + (r.headers.has("ratelimit-limit") ? "" : " skipped")

const answers = async (asks: Ask[], make: () => Hono) => {
  const app = make()
  const out: string[] = []
  for (const ask of asks) {
    out.push(
      answer(
        await app.fetch(new Request("http://api.test/", { headers: ask.headers }), env(ask.peer)),
      ),
    )
  }
  return out
}

// Three requests from 127.0.0.1 over a real socket, on Bun's default dual-stack listener and on one bound to 127.0.0.1.
const overSocket = async (hostname?: string) => {
  const server = Bun.serve({ fetch: single().fetch, hostname, port: 0 })
  const out: string[] = []
  for (let i = 0; i < 3; i++) out.push(answer(await fetch(\`http://127.0.0.1:\${server.port}/\`)))
  await server.stop(true)
  return out
}

const out: Record<string, string[]> = {}
for (const [name, asks] of Object.entries(
  JSON.parse(process.env.CASES ?? "{}") as Record<string, Ask[]>,
)) {
  out[name] = await answers(asks, single)
}
for (const [name, asks] of Object.entries(
  JSON.parse(process.env.STACKED ?? "{}") as Record<string, Ask[]>,
)) {
  out[name] = await answers(asks, stacked)
}
if (process.env.LOOPBACK) {
  out["a loopback client over a real socket on 127.0.0.1"] = await overSocket("127.0.0.1")
  out["a loopback client over a real socket on Bun's default listener"] = await overSocket()
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
    "a loopback client over a real socket on 127.0.0.1": skipped,
    "a loopback client over a real socket on Bun's default listener": skipped,
  })
})

test("off Vercel, an IPv4 client that Bun's dual-stack listener reports as ::ffff:a.b.c.d is read as that IPv4 address, and an IPv6 peer as itself", async () => {
  expect(
    await probe(
      {
        "a mapped public peer that rotates x-forwarded-for": rotating("::ffff:1.2.3.4"),
        "a mapped public peer with no forwarding header": three({ peer: "::ffff:1.2.3.4" }),
        "a mapped private-network peer with no forwarding header": three({
          peer: "::ffff:10.0.0.1",
        }),
        "a mapped loopback peer with no forwarding header": three({ peer: "::ffff:127.0.0.1" }),
        "a public IPv6 peer that rotates x-forwarded-for": rotating("2001:4860:4860::8888"),
        "an IPv6 loopback peer with no forwarding header": three({ peer: "::1" }),
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
    "a mapped private-network peer with no forwarding header": skipped,
    "a mapped loopback peer with no forwarding header": skipped,
    "a public IPv6 peer that rotates x-forwarded-for": limited,
    "an IPv6 loopback peer with no forwarding header": skipped,
    "a mapped private proxy's public client": limited,
    "a mapped Docker peer with no forwarding header": skipped,
  })
})

test("off Vercel, a mapped address a proxy forwards is read as its IPv4 address", async () => {
  const behind = (client: string, peer: string) =>
    three({ headers: { "x-forwarded-for": client }, peer })
  expect(
    await probe(
      {
        "a mapped client behind a mapped private proxy": behind(
          "::ffff:1.2.3.4",
          "::ffff:172.18.0.2",
        ),
        "a mapped client behind a private proxy": behind("::ffff:1.2.3.4", "172.18.0.2"),
        "a mapped private client behind a private proxy": behind(
          "::ffff:192.168.1.9",
          "172.18.0.2",
        ),
      },
      {},
    ),
  ).toEqual({
    "a mapped client behind a mapped private proxy": limited,
    "a mapped client behind a private proxy": limited,
    "a mapped private client behind a private proxy": skipped,
  })
})

test("off Vercel, a Cloudflare edge peer is a proxy whose cf-connecting-ip names the client, and a forged one from any other peer counts for nothing", async () => {
  const edge = (client: string, peer = "::ffff:104.16.0.1") => ({
    headers: { "cf-connecting-ip": client },
    peer,
  })
  expect(
    await probe(
      {
        "three clients through one Cloudflare edge": [
          edge("1.2.3.4"),
          edge("5.6.7.8"),
          edge("9.10.11.12"),
        ],
        "one client through two Cloudflare edges": [
          edge("1.2.3.4"),
          edge("1.2.3.4", "162.158.0.1"),
          edge("1.2.3.4", "2606:4700::1"),
        ],
        "a public peer outside Cloudflare that rotates cf-connecting-ip": [
          edge("1.2.3.4", "8.8.8.8"),
          edge("5.6.7.8", "8.8.8.8"),
          edge("9.10.11.12", "8.8.8.8"),
        ],
      },
      {},
    ),
  ).toEqual({
    // each client keeps a bucket of its own, though all share one edge address
    "three clients through one Cloudflare edge": ["200", "200", "200"],
    "one client through two Cloudflare edges": limited,
    "a public peer outside Cloudflare that rotates cf-connecting-ip": limited,
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
