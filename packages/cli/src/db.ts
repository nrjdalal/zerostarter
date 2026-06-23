import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { join } from "node:path"

import { exists, read, write } from "@/io"

const PGLAUNCH = "pglaunch@5.5.7"

// Capture a command's stdout (throws on non-zero); used to read pglaunch's printed URL.
const capture = (cmd: string, args: string[], cwd: string): string =>
  execFileSync(cmd, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1 << 26,
    stdio: ["ignore", "pipe", "pipe"],
  })

// Run a command with inherited stdio so the user sees its progress (throws on non-zero).
const runVisible = (cmd: string, args: string[], cwd: string): void => {
  execFileSync(cmd, args, { cwd, stdio: "inherit" })
}

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

// Launch a kept local Postgres via pglaunch and return the URL it prints (e.g. `postgres://postgres:postgres@localhost:<port>/postgres`; the postgresql:// scheme and query params are also accepted).
const launchPostgres = (dir: string): string => {
  const out = capture("bunx", [PGLAUNCH, "-k"], dir)
  const match = out.match(/postgres(?:ql)?:\/\/[\w.:@\-/%?=&]+/)
  if (!match) throw new Error("pglaunch did not print a connection URL")
  return match[0]
}

// Provision a local database, point .env at it, and apply the shipped migrations (a fresh fork ships its migration files, so db:generate is not needed).
export const provisionDatabase = (dir: string): void => {
  const envPath = ensureEnv(dir)
  setEnvVar(envPath, "POSTGRES_URL", launchPostgres(dir))
  runVisible("bun", ["run", "db:migrate"], dir)
}
