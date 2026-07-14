// Runs `turbo run dev` through portless: each dev server gets a stable named .localhost URL instead of a port. Sets PORTLESS_* so the per-app portless runners auto-start the shared proxy unprivileged (:1355, HTTP, no /etc/hosts write) instead of the default 443 (which needs sudo); turbo forwards these to the tasks via globalPassThroughEnv. `PORTLESS=0 bun run dev` bypasses portless and uses the plain localhost ports from .env. Chrome/Firefox/Edge resolve `.localhost` natively; Safari needs the hosts file.
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
