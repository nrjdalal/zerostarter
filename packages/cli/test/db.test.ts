import { afterEach, beforeEach, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { hasPostgresUrl, seedEnv } from "@/db"

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
