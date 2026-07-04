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

// Pull the first Postgres connection URL out of pglaunch's output. pglaunch prints one whether it just started a container or, on a name collision, reports an already-running one; the URL line may be ANSI-colored. Returns null when no URL is present.
export const parsePglaunchUrl = (out: string): string | null => {
  const match = out.match(/postgres(?:ql)?:\/\/[\w.:@\-/%?=&]+/)
  return match ? match[0] : null
}

// Run pglaunch (-k keeps the container, --bun runs it under the Bun runtime) and return the connection URL it prints, or null when it prints none. On a name collision pglaunch exits non-zero but still prints the already-running container's URL, so we reuse that instead of failing. Passing confirm adds -c to force a brand-new container even when a similar-named one is already running.
const runPglaunch = (dir: string, confirm: boolean): string | null => {
  const args = confirm ? ["--bun", PGLAUNCH, "-k", "-c"] : ["--bun", PGLAUNCH, "-k"]
  let out: string
  try {
    out = capture("bunx", args, dir)
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string }
    out = [e.stdout, e.stderr].filter(Boolean).join("\n")
  }
  return parsePglaunchUrl(out)
}

// Provision a local Postgres and point .env at it, reusing an already-running one when it exists. Migrations are deferred: the user runs `bun install && bun run db:migrate`, so this never needs the project's dependencies.
export const provisionDatabase = (dir: string): void => {
  const envPath = ensureEnv(dir)
  const url = runPglaunch(dir, false) || runPglaunch(dir, true)
  if (!url) throw new Error("pglaunch did not print a connection URL")
  setEnvVar(envPath, "POSTGRES_URL", url)
}
