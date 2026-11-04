import { expect, test } from "bun:test"
import { join } from "node:path"

const API = join(import.meta.dir, "../../../../../api/hono")

// server.ts reads VERCEL once, when it loads, so the Vercel branch runs in a child process of its own.
const PROBE = `
import { Hono } from "hono"
import { createServer, upgradeWebSocket } from "./src/lib/server"

const app = new Hono().get("/ws", upgradeWebSocket(() => ({ onOpen: (_event, ws) => ws.send("hello") })))
const server = createServer(app) as import("node:http").Server
await Bun.sleep(200)
const listening = server.listening
if (!listening) await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
const { port } = server.address() as { port: number }
const ws = new WebSocket("ws://127.0.0.1:" + port + "/ws")
const message = await new Promise<string>((resolve, reject) => {
  ws.onmessage = (event) => resolve(String(event.data))
  ws.onerror = () => reject(new Error("the upgrade failed"))
  setTimeout(() => reject(new Error("no message in 3s")), 3000)
})
ws.close()
server.close()
console.log(JSON.stringify({ listening, message }))
`

test("on Vercel, createServer returns a server that has not listened, whose WebSocket route still upgrades", async () => {
  const proc = Bun.spawn([process.execPath, "-e", PROBE], {
    cwd: API,
    env: { ...process.env, PORT: "0", SKIP_ENV_VALIDATION: "true", VERCEL: "1" },
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
  // Vercel hangs a function whose default export already listens, so the platform must be the one to listen
  expect(JSON.parse(out)).toEqual({ listening: false, message: "hello" })
}, 15_000)
