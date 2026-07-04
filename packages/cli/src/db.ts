import { randomBytes } from "node:crypto"
import { readdirSync } from "node:fs"
import { join } from "node:path"

import { exists, read, write } from "@/io"
import { formatDuration, ok, run, runTail } from "@/spawn"

const PGLAUNCH = "pglaunch@5.5.7"

// True when a Docker daemon is reachable (pglaunch needs it to start a Postgres container).
export const dockerRunning = async (): Promise<boolean> => ok("docker", ["info"])

// Ensure .env exists as a 1-to-1 copy of .env.example; returns its path.
const ensureEnv = (dir: string): string => {
  const envPath = join(dir, ".env")
  if (!exists(envPath)) {
    const example = join(dir, ".env.example")
    write(envPath, exists(example) ? read(example) : "")
  }
  return envPath
}

// Read a key's value from the env file ("" when unset or empty).
const getEnvVar = (envPath: string, key: string): string => {
  const prefix = `${key}=`
  const line = read(envPath)
    .split("\n")
    .find((l) => l.startsWith(prefix))
  return line ? line.slice(prefix.length).trim() : ""
}

// Set key=value in the env file, replacing the existing line or appending a new one.
const setEnvVar = (envPath: string, key: string, value: string): void => {
  const prefix = `${key}=`
  const lines = read(envPath).split("\n")
  const idx = lines.findIndex((l) => l.startsWith(prefix))
  if (idx >= 0) {
    lines[idx] = `${prefix}${value}`
  } else {
    while (lines.length && lines[lines.length - 1] === "") lines.pop()
    lines.push(`${prefix}${value}`, "")
  }
  write(envPath, lines.join("\n"))
}

// Create .env from .env.example and fill a generated BETTER_AUTH_SECRET when it is empty.
export const seedEnv = (dir: string): void => {
  const envPath = ensureEnv(dir)
  if (!getEnvVar(envPath, "BETTER_AUTH_SECRET")) {
    setEnvVar(envPath, "BETTER_AUTH_SECRET", randomBytes(32).toString("base64"))
  }
}

// True when .env already has a non-empty POSTGRES_URL, so init must not clobber a configured database.
export const hasPostgresUrl = (dir: string): boolean => {
  const envPath = join(dir, ".env")
  return exists(envPath) && getEnvVar(envPath, "POSTGRES_URL") !== ""
}

// A launched (or reused) local Postgres: its connection URL and Docker container name.
type Launch = { url: string; container: string }

// Pull the connection URL and container name out of pglaunch's output. pglaunch prints both whether it just started a container (`... name "<name> :<port>" started ...`) or, on a name collision, reports an already-running one (`... similar name "<name>" running ...`); the URL line may be ANSI-colored. Returns null when no URL is present.
export const parseLaunch = (out: string): Launch | null => {
  const url = out.match(/postgres(?:ql)?:\/\/[\w.:@\-/%?=&]+/)
  if (!url) return null
  const started = out.match(/name "([^" ]+) :\d+" started/)
  const similar = out.match(/similar name "([^"]+)"/)
  return { url: url[0], container: started ? started[1] : similar ? similar[1] : "" }
}

// Run pglaunch (-k keeps the container, --bun runs it under the Bun runtime) and return what it launched, or null when it prints no URL. On a name collision pglaunch exits non-zero but still prints the already-running container's URL, so we reuse that instead of failing. Passing confirm adds -c to force a brand-new container even when a similar-named one is already running.
const runPglaunch = async (
  dir: string,
  confirm: boolean,
): Promise<{ launch: Launch | null; out: string }> => {
  const args = confirm ? ["--bun", PGLAUNCH, "-k", "-c"] : ["--bun", PGLAUNCH, "-k"]
  let out: string
  try {
    out = await run("bunx", args, dir)
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string }
    out = [e.stdout, e.stderr].filter(Boolean).join("\n")
  }
  return { launch: parseLaunch(out), out }
}

// Resolve after `ms` milliseconds.
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Wait until the container's Postgres accepts connections. pglaunch returns as soon as `docker run` starts, but the server needs a moment to finish booting, so migrating immediately races and fails. pglaunch containers are postgres:alpine, which ships pg_isready. Best-effort: returns once ready or after the attempts are exhausted.
const waitForPostgres = async (container: string): Promise<void> => {
  if (!container) return
  for (let i = 0; i < 30; i++) {
    if (await ok("docker", ["exec", container, "pg_isready", "-U", "postgres"])) return
    await sleep(1000)
  }
}

// Provision a local Postgres (reusing an already-running one), point .env at it, wait for it to accept connections, and apply the migrations with live progress. Needs the project's dependencies (drizzle-kit), so the caller runs bun install first.
export const provisionDatabase = async (dir: string): Promise<void> => {
  const envPath = ensureEnv(dir)
  const first = await runPglaunch(dir, false)
  const result = first.launch ? first : await runPglaunch(dir, true)
  if (!result.launch)
    throw new Error(result.out.trim() || "pglaunch did not print a connection URL")
  setEnvVar(envPath, "POSTGRES_URL", result.launch.url)
  await waitForPostgres(result.launch.container)
  const count = migrationCount(dir)
  await runTail("bun", ["run", "db:migrate"], {
    cwd: dir,
    label: "Provisioning the database",
    summarize: (out, ms) =>
      out.includes("migrations applied successfully")
        ? `${count} migration${count === 1 ? "" : "s"} applied ${formatDuration(ms)}`
        : `Database migrated ${formatDuration(ms)}`,
  })
}

// Number of drizzle migration files the fork ships; on a fresh database db:migrate applies them all.
const migrationCount = (dir: string): number => {
  try {
    return readdirSync(join(dir, "packages/db/drizzle")).filter((f) => f.endsWith(".sql")).length
  } catch {
    return 0
  }
}
