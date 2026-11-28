// Run by rate-limiter.test.ts in a process of its own, since the limiter reads VERCEL once as it loads. Prints each case's answers as JSON.
import { Hono } from "hono"

import { createRateLimiter } from "../../../../../api/hono/src/middlewares/rate-limiter"

export type Ask = { headers?: Record<string, string>; peer?: string }

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
  for (let i = 0; i < 3; i++) out.push(answer(await fetch(`http://127.0.0.1:${server.port}/`)))
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
