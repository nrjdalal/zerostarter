/**
 * Shared stack lifecycle for the test scripts. Ensures the app + API are up for
 * a run and tears down ONLY what it starts — a running stack is reused and left
 * alone. Used by run.ts (deterministic/e2e), visual.ts (visual parity), and
 * all.ts (both), so every script "just works" whether or not `bun dev` is going.
 *
 * Platform-agnostic: no shell or external binaries (no bash/lsof/awk/xargs/kill).
 * Port checks use Bun.connect, the dev process is spawned detached so it leads
 * its own process group, and teardown signals that group — so it behaves the
 * same on macOS, Linux, and CI without depending on the host's tooling.
 *
 * Bun-native where Bun offers it (Bun.connect, Bun.spawnSync, Bun.sleep); the
 * dev spawn falls back to node:child_process only because Bun.spawn has no
 * detached/process-group option, which the group-kill teardown needs.
 */
import { spawn, type ChildProcess } from "node:child_process"
import { openSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

export const BASE = process.env.BASE_URL ?? "http://localhost:3000"
export const API = process.env.API_URL ?? "http://localhost:4000"
const repoRoot = `${import.meta.dir}/../../..`
const stackLog = join(tmpdir(), "cafe-test-stack.log")

const portOf = (url: string) => Number(new URL(url).port || "80")

const fail = (msg: string) => {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return res.ok || res.status === 404
  } catch {
    return false
  }
}

const stackUp = async () =>
  (await reachable(`${BASE}/robots.txt`)) && (await reachable(`${API}/api/health`))

// Portable "is something listening here?" — open a TCP connection (Bun.connect)
// and see if it's accepted, rather than shelling out to lsof. Resolves false
// when refused; only used for localhost ports, where refusal is immediate, so
// no extra timeout is needed.
async function portListening(url: string): Promise<boolean> {
  const { hostname, port } = new URL(url)
  try {
    const socket = await Bun.connect({
      hostname: hostname || "127.0.0.1",
      port: Number(port || "80"),
      socket: { open() {}, data() {}, close() {}, error() {} },
    })
    socket.end()
    return true
  } catch {
    return false
  }
}

// Ensures BASE+API are reachable, returning a teardown fn. If the stack was
// already up it's a no-op (reuse, don't clobber); if we started it, teardown
// stops the whole dev process group. Pass { browser: true } to also require the
// agent-browser CLI.
export async function ensureStack(opts: { browser?: boolean } = {}): Promise<() => void> {
  if (opts.browser) {
    const probe = Bun.spawnSync(["bunx", "agent-browser", "--version"], {
      stdout: "ignore",
      stderr: "ignore",
    })
    if (probe.exitCode !== 0) {
      fail(
        "agent-browser CLI not found (needed for the browser/visual tier).\n" +
          "  Install it: npm i -g agent-browser && agent-browser install",
      )
    }
  }

  let dev: ChildProcess | undefined
  const teardown = () => {
    if (!dev?.pid) return
    // dev is spawned detached, so it leads its own process group; signalling the
    // negative pid takes down turbo AND the dev servers it spawned (a plain
    // kill would orphan them). try/catch: the group may already be gone.
    try {
      process.kill(-dev.pid, "SIGTERM")
    } catch {
      // already exited
    }
  }

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      teardown()
      process.exit(sig === "SIGINT" ? 130 : 143)
    })
  }

  if (await stackUp()) {
    console.log(`✓ reusing the running stack (${BASE}, ${API}) — leaving it up`)
    return teardown
  }

  // don't start (and later kill) anything if a port is held by a process that
  // isn't a full Cafe stack — fail loudly instead of risking a foreign kill
  const occupied: string[] = []
  for (const u of [BASE, API]) {
    if (await portListening(u)) occupied.push(u)
  }
  if (occupied.length > 0) {
    fail(
      `port(s) ${occupied.map(portOf).join(", ")} are occupied but the stack isn't healthy.\n` +
        `  Something other than the Cafe stack is on them. Free it, or point\n` +
        `  BASE_URL / API_URL at the right target.`,
    )
  }

  console.log("• stack not running — starting `bun dev` (will stop it after the run)…")
  // detached so the child leads a new process group (see teardown); stdout/err
  // go to the log file by fd. node:child_process (not Bun.spawn) for portable
  // detached/group-kill semantics.
  const log = openSync(stackLog, "a")
  dev = spawn("bunx", ["turbo", "run", "dev", "--ui", "stream"], {
    cwd: repoRoot,
    env: process.env,
    detached: true,
    stdio: ["ignore", log, log],
  })
  const deadline = Date.now() + 120_000
  while (!(await stackUp())) {
    if (Date.now() > deadline) {
      teardown()
      fail(`stack did not become healthy within 120s. See ${stackLog}`)
    }
    await Bun.sleep(1000)
  }
  console.log("✓ stack up")
  return teardown
}
