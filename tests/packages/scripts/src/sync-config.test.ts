import { describe, expect, test } from "bun:test"
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const root = join(import.meta.dir, "../../../..")
const script = join(root, "packages/scripts/src/sync-config.ts")

const check = (cwd: string) => {
  const run = Bun.spawnSync(["bun", script, "--check"], { cwd, stderr: "pipe", stdout: "pipe" })
  return { code: run.exitCode, stderr: run.stderr.toString() }
}

// A copy of every file the sync reads, so a hand edit there never touches the checkout.
const copyConfigs = (keep: (file: string) => boolean = () => true) => {
  const dir = mkdtempSync(join(tmpdir(), "sync-config-"))
  const files = Bun.spawnSync(["git", "ls-files", "*package.json", "*tsconfig.json"], { cwd: root })
    .stdout.toString()
    .split("\n")
    .filter((file) => file && keep(file))
  for (const file of files) {
    mkdirSync(join(dir, dirname(file)), { recursive: true })
    cpSync(join(root, file), join(dir, file))
  }
  return dir
}

describe("sync:config --check", () => {
  test("passes on the synced tree", () => {
    expect(check(root)).toEqual({ code: 0, stderr: "" })
  })

  test("passes on a fork, which takes neither packages/cli nor tests/", () => {
    const dir = copyConfigs((file) => !/^(packages\/cli|tests)\//.test(file))
    try {
      expect(check(dir)).toEqual({ code: 0, stderr: "" })
    } finally {
      rmSync(dir, { force: true, recursive: true })
    }
  })

  test("fails naming a hand-edited tsconfig", async () => {
    const dir = copyConfigs()
    try {
      const file = join(dir, "packages/db/tsconfig.json")
      const config = await Bun.file(file).json()
      config.compilerOptions.strict = false
      await Bun.write(file, JSON.stringify(config, null, 2))
      const { code, stderr } = check(dir)
      expect(code).toBe(1)
      expect(stderr).toContain("packages/db/tsconfig.json")
      expect(stderr).not.toContain("packages/env/tsconfig.json")
    } finally {
      rmSync(dir, { force: true, recursive: true })
    }
  })

  test("fails naming a package.json whose type-check dependency went missing", async () => {
    const dir = copyConfigs()
    try {
      const file = join(dir, "packages/env/package.json")
      const pkg = await Bun.file(file).json()
      delete pkg.devDependencies.typescript
      await Bun.write(file, JSON.stringify(pkg, null, 2))
      const { code, stderr } = check(dir)
      expect(code).toBe(1)
      expect(stderr).toContain("packages/env/package.json")
    } finally {
      rmSync(dir, { force: true, recursive: true })
    }
  })
})
