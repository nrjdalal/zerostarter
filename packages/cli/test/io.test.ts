import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  emptyDir,
  exists,
  findPackageJsons,
  read,
  readJson,
  remove,
  removeMatch,
  write,
  writeJson,
} from "@/io"

let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zs-io-"))
})
afterEach(() => {
  rmSync(dir, { force: true, recursive: true })
})

// Normalize to forward slashes so the assertion holds on Windows (findPackageJsons returns native paths).
const rel = (paths: string[]) =>
  paths.map((p) => p.slice(dir.length + 1).replaceAll("\\", "/")).sort()

describe("file helpers", () => {
  test("write creates parent dirs; read/exists round-trip", () => {
    write(join(dir, "a/b/c.txt"), "hi")
    expect(exists(join(dir, "a/b/c.txt"))).toBe(true)
    expect(read(join(dir, "a/b/c.txt"))).toBe("hi")
  })

  test("readJson/writeJson round-trip and writeJson ends with a newline", () => {
    writeJson(join(dir, "p.json"), { name: "x", nested: { a: 1 } })
    expect(readJson<{ name: string; nested: { a: number } }>(join(dir, "p.json"))).toEqual({
      name: "x",
      nested: { a: 1 },
    })
    expect(read(join(dir, "p.json")).endsWith("}\n")).toBe(true)
  })

  test("remove is a no-op on a missing path and deletes recursively", () => {
    expect(() => remove(join(dir, "nope"))).not.toThrow()
    mkdirSync(join(dir, "sub"))
    writeFileSync(join(dir, "sub/x"), "1")
    remove(join(dir, "sub"))
    expect(exists(join(dir, "sub"))).toBe(false)
  })
})

describe("removeMatch", () => {
  test("removes the first regex match and reports the change", () => {
    writeFileSync(join(dir, "f.ts"), "keep\nREMOVE-ME\ntail\n")
    expect(removeMatch(join(dir, "f.ts"), /REMOVE-ME\n/)).toBe(true)
    expect(read(join(dir, "f.ts"))).toBe("keep\ntail\n")
  })

  test("returns false when nothing matches or the file is missing", () => {
    writeFileSync(join(dir, "f.ts"), "keep\n")
    expect(removeMatch(join(dir, "f.ts"), /nope/)).toBe(false)
    expect(removeMatch(join(dir, "missing.ts"), /x/)).toBe(false)
  })
})

describe("emptyDir", () => {
  test("keeps the top-level .git and .env* at any depth, wipes everything else", () => {
    execFileSync("git", ["init", "-q"], { cwd: dir })
    writeFileSync(join(dir, ".env"), "ROOT=1")
    writeFileSync(join(dir, ".env.production.local"), "PROD=1")
    writeFileSync(join(dir, "app.ts"), "code")
    write(join(dir, "web/next/.env.local"), "NESTED=1")
    write(join(dir, "web/next/page.tsx"), "x")
    write(join(dir, "node_modules/pkg/index.js"), "y")

    emptyDir(dir)

    expect(exists(join(dir, ".git"))).toBe(true)
    expect(read(join(dir, ".env"))).toBe("ROOT=1")
    expect(read(join(dir, ".env.production.local"))).toBe("PROD=1")
    expect(read(join(dir, "web/next/.env.local"))).toBe("NESTED=1")
    expect(exists(join(dir, "app.ts"))).toBe(false)
    expect(exists(join(dir, "web/next/page.tsx"))).toBe(false)
    expect(exists(join(dir, "node_modules"))).toBe(false)
  })

  test("removes a directory that held only non-preserved files", () => {
    write(join(dir, "src/a.ts"), "x")
    emptyDir(dir)
    expect(exists(join(dir, "src"))).toBe(false)
  })

  test("wipes a nested .git (embedded repo) but keeps the top-level .git", () => {
    execFileSync("git", ["init", "-q"], { cwd: dir })
    // A leftover embedded repo, e.g. a gitignored test fixture; its nested .git
    // must be wiped so a later `git add -A` does not choke on it.
    write(join(dir, ".test-artifacts/cli/61/.git/HEAD"), "ref: refs/heads/main\n")
    write(join(dir, "app.ts"), "code")

    emptyDir(dir)

    expect(exists(join(dir, ".git"))).toBe(true)
    expect(exists(join(dir, ".test-artifacts"))).toBe(false)
    expect(exists(join(dir, "app.ts"))).toBe(false)
  })
})

describe("findPackageJsons", () => {
  test("finds every workspace manifest and skips node_modules and .git", () => {
    for (const p of [
      "package.json",
      "web/next/package.json",
      "api/hono/package.json",
      "packages/db/package.json",
      "node_modules/dep/package.json",
      ".git/package.json",
    ]) {
      write(join(dir, p), "{}")
    }
    expect(rel(findPackageJsons(dir))).toEqual([
      "api/hono/package.json",
      "package.json",
      "packages/db/package.json",
      "web/next/package.json",
    ])
  })
})
