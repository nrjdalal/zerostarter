// Runs turbo through portless on an unprivileged :1355 HTTP proxy (no sudo, no /etc/hosts write); PORTLESS=0 bypasses it.
import { join } from "node:path"

const env = {
  ...process.env,
  PATH: `${join(process.cwd(), "node_modules", ".bin")}:${process.env.PATH ?? ""}`,
  PORTLESS_PORT: process.env.PORTLESS_PORT ?? "1355",
  PORTLESS_HTTPS: process.env.PORTLESS_HTTPS ?? "0",
  PORTLESS_SYNC_HOSTS: process.env.PORTLESS_SYNC_HOSTS ?? "0",
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
