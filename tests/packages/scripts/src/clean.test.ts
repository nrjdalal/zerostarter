import { expect, test } from "bun:test"
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const script = join(import.meta.dir, "../../../../packages/scripts/src/clean.ts")

const removed = [
  ".generated/env.ts",
  ".turbo/cache/a",
  "api/hono/bundle/index.mjs",
  "api/hono/tsconfig.tsbuildinfo",
  "node_modules/x/index.js",
  "packages/db/dist/index.mjs",
  "packages/db/node_modules/y/index.js",
  "tests/coverage/lcov.info",
  "web/next/.next/build-manifest.json",
  "web/next/.playwright-cli/a",
  "web/next/.source/index.ts",
  "web/next/content/blog/meta.json",
  "web/next/content/console/docs/meta.json",
  "web/next/content/docs/meta.json",
  "web/next/next-env.d.ts",
  "web/next/vercel-bundle/index.mjs",
]

const kept = [
  ".claude/worktrees/x/node_modules/z/index.js",
  ".env",
  ".git/HEAD",
  "packages/scripts/src/modules.d.ts",
  "web/next/content/docs/index.mdx",
  "web/next/src/app/page.tsx",
]

test("removes every generated artifact and keeps config, source and dot-folders it does not name", () => {
  const dir = mkdtempSync(join(tmpdir(), "clean-"))
  try {
    for (const file of [...removed, ...kept]) {
      mkdirSync(join(dir, dirname(file)), { recursive: true })
      writeFileSync(join(dir, file), "")
    }
    const out = Bun.spawnSync(["bun", script], { cwd: dir, stderr: "pipe" })
    expect(out.stderr.toString()).toBe("")
    expect(out.exitCode).toBe(0)
    expect(removed.filter((file) => existsSync(join(dir, file)))).toEqual([])
    expect(kept.filter((file) => !existsSync(join(dir, file)))).toEqual([])
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
})

test.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
  "records a removal that fails mid-walk, keeps going and exits nonzero",
  () => {
    const dir = mkdtempSync(join(tmpdir(), "clean-walk-"))
    const locked = join(dir, "node_modules/locked")
    try {
      mkdirSync(locked, { recursive: true })
      writeFileSync(join(locked, "index.js"), "")
      for (const file of ["packages/db/dist/index.mjs", "web/next/content/docs/meta.json"]) {
        mkdirSync(join(dir, dirname(file)), { recursive: true })
        writeFileSync(join(dir, file), "")
      }
      chmodSync(locked, 0o555)
      const out = Bun.spawnSync(["bun", script], { cwd: dir, stderr: "pipe" })
      expect(out.exitCode).toBe(1)
      expect(out.stderr.toString()).not.toBe("")
      expect(existsSync(locked)).toBe(true)
      expect(existsSync(join(dir, "packages/db/dist/index.mjs"))).toBe(false)
      expect(existsSync(join(dir, "web/next/content/docs/meta.json"))).toBe(false)
    } finally {
      chmodSync(locked, 0o755)
      rmSync(dir, { force: true, recursive: true })
    }
  },
)

test.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
  "records a PATHS removal that fails, keeps going and exits nonzero",
  () => {
    const dir = mkdtempSync(join(tmpdir(), "clean-paths-"))
    const locked = join(dir, "web/next/content/blog")
    try {
      for (const file of [
        "packages/db/dist/index.mjs",
        "web/next/content/blog/meta.json",
        "web/next/content/console/docs/meta.json",
        "web/next/content/docs/meta.json",
      ]) {
        mkdirSync(join(dir, dirname(file)), { recursive: true })
        writeFileSync(join(dir, file), "")
      }
      chmodSync(locked, 0o555)
      const out = Bun.spawnSync(["bun", script], { cwd: dir, stderr: "pipe" })
      expect(out.exitCode).toBe(1)
      expect(out.stderr.toString()).not.toBe("")
      expect(existsSync(join(locked, "meta.json"))).toBe(true)
      expect(existsSync(join(dir, "web/next/content/console/docs/meta.json"))).toBe(false)
      expect(existsSync(join(dir, "web/next/content/docs/meta.json"))).toBe(false)
      expect(existsSync(join(dir, "packages/db/dist/index.mjs"))).toBe(false)
    } finally {
      chmodSync(locked, 0o755)
      rmSync(dir, { force: true, recursive: true })
    }
  },
)
