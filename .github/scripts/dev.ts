// Runs `turbo run dev` through portless so each dev server gets a stable named .localhost URL instead of a
// port. Unprivileged by design: the proxy binds :1355 (not 443), serves HTTP (no local CA to trust), and never
// writes /etc/hosts, so `bun dev` needs no sudo, no global install, no admin prompt. `.localhost` resolves
// natively in Chrome/Firefox/Edge (Safari needs the hosts file, a documented caveat). `PORTLESS=0 bun dev`
// bypasses portless entirely and runs the apps on their plain localhost ports from .env.
import { join } from "node:path"

const bypass = process.env.PORTLESS === "0"

// Bun.spawn resolves against PATH, not node_modules/.bin, so put the workspace bins first (portless, turbo).
const env = {
  ...process.env,
  PATH: `${join(process.cwd(), "node_modules", ".bin")}:${process.env.PATH ?? ""}`,
  PORTLESS_PORT: process.env.PORTLESS_PORT ?? "1355",
  PORTLESS_HTTPS: process.env.PORTLESS_HTTPS ?? "0",
  PORTLESS_SYNC_HOSTS: process.env.PORTLESS_SYNC_HOSTS ?? "0",
}

// The app-runner only auto-starts the proxy on the privileged default port (needs sudo). Start it ourselves on
// the unprivileged HTTP port first; it daemonizes and is idempotent, so an already-running proxy is reused.
if (!bypass) {
  try {
    await Bun.spawn(["portless", "proxy", "start", "--port", env.PORTLESS_PORT, "--no-tls"], {
      env,
      stdio: ["ignore", "inherit", "inherit"],
    }).exited
  } catch {}
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
