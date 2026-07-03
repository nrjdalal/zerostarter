import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { hasPostgresUrl, parseLaunch, seedEnv } from "@/db"

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zs-db-"))
})

afterEach(() => {
  rmSync(dir, { force: true, recursive: true })
})

const secretOf = (env: string): string =>
  env
    .split("\n")
    .find((l) => l.startsWith("BETTER_AUTH_SECRET="))
    ?.slice("BETTER_AUTH_SECRET=".length) ?? ""

test("seedEnv copies .env.example and fills BETTER_AUTH_SECRET", () => {
  writeFileSync(join(dir, ".env.example"), "NODE_ENV=local\nBETTER_AUTH_SECRET=\nPOSTGRES_URL=\n")
  seedEnv(dir)
  const env = readFileSync(join(dir, ".env"), "utf8")
  expect(env).toContain("NODE_ENV=local")
  expect(secretOf(env).length).toBeGreaterThan(20)
})

test("seedEnv is idempotent and keeps the existing secret", () => {
  writeFileSync(join(dir, ".env.example"), "BETTER_AUTH_SECRET=\n")
  seedEnv(dir)
  const first = readFileSync(join(dir, ".env"), "utf8")
  seedEnv(dir)
  expect(readFileSync(join(dir, ".env"), "utf8")).toBe(first)
})

test("seedEnv does not overwrite a pre-set secret", () => {
  writeFileSync(join(dir, ".env"), "BETTER_AUTH_SECRET=preset\n")
  seedEnv(dir)
  expect(secretOf(readFileSync(join(dir, ".env"), "utf8"))).toBe("preset")
})

test("hasPostgresUrl reflects whether POSTGRES_URL is set", () => {
  writeFileSync(join(dir, ".env"), "POSTGRES_URL=\n")
  expect(hasPostgresUrl(dir)).toBe(false)
  writeFileSync(join(dir, ".env"), "POSTGRES_URL=postgres://x@localhost:5432/db\n")
  expect(hasPostgresUrl(dir)).toBe(true)
})

test("parseLaunch reads a freshly started container and marks it not reused", () => {
  const out =
    '- A container with name "my-app-a1B2 :5433" started successfully.\n\n' +
    "  POSTGRES_URL=postgres://postgres:postgres@localhost:5433/postgres"
  expect(parseLaunch(out)).toEqual({
    url: "postgres://postgres:postgres@localhost:5433/postgres",
    container: "my-app-a1B2",
    reused: false,
  })
})

test("parseLaunch reuses the container pglaunch reports on a name collision", () => {
  // pglaunch exits non-zero but prints the already-running container's URL (ANSI-wrapped).
  const out =
    '- A container by similar name "my-app-pDtx" running at port 4611.\n\n' +
    "  \x1b[31mPOSTGRES_URL=postgres://postgres:postgres@localhost:4611/postgres\x1b[39m\n" +
    "  Error:\n  - Specify a different name with the `-n` flag, e.g. -n my-project."
  expect(parseLaunch(out)).toEqual({
    url: "postgres://postgres:postgres@localhost:4611/postgres",
    container: "my-app-pDtx",
    reused: true,
  })
})

test("parseLaunch treats a URL with no start line as a reuse (never abandoned)", () => {
  expect(parseLaunch("POSTGRES_URL=postgres://postgres:postgres@localhost:7000/postgres")).toEqual({
    url: "postgres://postgres:postgres@localhost:7000/postgres",
    container: "",
    reused: true,
  })
})

test("parseLaunch returns null when no URL is present", () => {
  expect(parseLaunch("- Docker is installed but not running.")).toBeNull()
})
