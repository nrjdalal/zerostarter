// Runs `turbo run dev` through portless: each dev server gets a stable named .localhost URL instead of a port. Sets PORTLESS_* so the per-app portless runners auto-start the shared proxy unprivileged (:1355, HTTP, no /etc/hosts write) instead of the default 443 (which needs sudo); turbo forwards these to the tasks via globalPassThroughEnv. `PORTLESS=0 bun dev` bypasses portless and uses the plain localhost ports from .env. Chrome/Firefox/Edge resolve `.localhost` natively; Safari needs the hosts file.
import { createServer } from "node:net"
import { join } from "node:path"

// The next free port at or after `start`, so several worktrees can `bun dev` at once (3000/4000, then 3001/4001, ...) without colliding; probes on 0.0.0.0 to match how the dev servers bind (a 127.0.0.1 probe misses a sibling on `*`). The apps bind these via portless --app-port and INTERNAL_API_URL follows HONO_PORT.
function freePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const attempt = (port: number) => {
      const srv = createServer()
      srv.once("error", () => attempt(port + 1))
      srv.once("listening", () => srv.close(() => resolve(port)))
      srv.listen(port, "0.0.0.0")
    }
    attempt(start)
  })
}

const env = {
  ...process.env,
  PATH: `${join(process.cwd(), "node_modules", ".bin")}:${process.env.PATH ?? ""}`,
  PORTLESS_PORT: process.env.PORTLESS_PORT ?? "1355",
  PORTLESS_HTTPS: process.env.PORTLESS_HTTPS ?? "0",
  PORTLESS_SYNC_HOSTS: process.env.PORTLESS_SYNC_HOSTS ?? "0",
  WEB_PORT: process.env.WEB_PORT ?? String(await freePort(3000)),
  HONO_PORT: process.env.HONO_PORT ?? String(await freePort(4000)),
}

const args = process.argv.slice(2)
const hasUi = args.some((a) => a === "--ui" || a.startsWith("--ui="))
const proc = Bun.spawn(["turbo", "run", "dev", ...(hasUi ? [] : ["--ui", "tui"]), ...args], {
  env,
  stdio: ["inherit", "inherit", "inherit"],
})

const stop = () => proc.kill()
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
process.exit(await proc.exited)
