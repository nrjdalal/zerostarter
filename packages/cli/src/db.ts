import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { join } from "node:path"

import { exists, read, write } from "@/io"

const PGLAUNCH = "pglaunch@5.5.7"

// Capture a command's output (throws on non-zero); keeps its progress out of the CLI's own output.
const capture = (cmd: string, args: string[], cwd: string): string =>
  execFileSync(cmd, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1 << 26,
    stdio: ["ignore", "pipe", "pipe"],
  })

// True when a Docker daemon is reachable (pglaunch needs it to start a Postgres container).
export const dockerRunning = (): boolean => {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

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

// A launched (or reused) local Postgres: the connection URL and its Docker container name.
type Launch = { url: string; container: string }

// Pull the connection URL and container name out of pglaunch's output. pglaunch prints both whether it just started a container (`... name "<name> :<port>" started ...`) or, on a name collision, reports an already-running one (`... similar name "<name>" running ...`); the URL line is ANSI-colored. Returns null when no URL is present.
export const parseLaunch = (out: string): Launch | null => {
  const url = out.match(/postgres(?:ql)?:\/\/[\w.:@\-/%?=&]+/)
  if (!url) return null
  const started = out.match(/name "([^" ]+) :\d+" started/)
  const similar = out.match(/similar name "([^"]+)"/)
  return { url: url[0], container: started ? started[1] : similar ? similar[1] : "" }
}

// Run pglaunch (-k keeps the container) and return what it launched, or null when it prints no URL. On a name collision pglaunch exits non-zero but still prints the already-running container's URL, so we reuse that instead of failing. Passing confirm adds -c to force a brand-new container even when a similar-named one is already running.
const runPglaunch = (dir: string, confirm: boolean): Launch | null => {
  const args = confirm ? [PGLAUNCH, "-k", "-c"] : [PGLAUNCH, "-k"]
  let out: string
  try {
    out = capture("bunx", args, dir)
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string }
    out = [e.stdout, e.stderr].filter(Boolean).join("\n")
  }
  return parseLaunch(out)
}

// Block for `ms` milliseconds (provisionDatabase runs synchronously, so this can't be an async delay).
const sleep = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

// Wait until the container's Postgres accepts connections. pglaunch returns as soon as `docker run` starts, but the server needs a moment to finish booting, so migrating immediately races and fails. pglaunch containers are postgres:alpine, which ships pg_isready. Best-effort: returns once ready or after the attempts are exhausted.
const waitForPostgres = (container: string): void => {
  if (!container) return
  for (let i = 0; i < 30; i++) {
    try {
      execFileSync("docker", ["exec", container, "pg_isready", "-U", "postgres"], {
        stdio: "ignore",
      })
      return
    } catch {
      sleep(1000)
    }
  }
}

// Provision a local database, point .env at it, and apply the shipped migrations (a fresh fork ships its migration files, so db:generate is not needed). Reuses an already-running local Postgres when one exists, and only starts a fresh container if the reused database rejects the migrations.
export const provisionDatabase = (dir: string): void => {
  const envPath = ensureEnv(dir)
  const migrate = (l: Launch): void => {
    setEnvVar(envPath, "POSTGRES_URL", l.url)
    waitForPostgres(l.container)
    capture("bun", ["run", "db:migrate"], dir)
  }

  const launched = runPglaunch(dir, false)
  if (launched) {
    try {
      migrate(launched)
      return
    } catch {
      // The reused database rejected the migrations; start a clean container below.
    }
  }

  const fresh = runPglaunch(dir, true)
  if (!fresh) throw new Error("pglaunch did not print a connection URL")
  migrate(fresh)
}
