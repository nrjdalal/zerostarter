import { describe, expect, test } from "bun:test"
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const root = join(import.meta.dir, "../../../..")
const script = join(root, "packages/scripts/src/sync-config.ts")

const run = (cwd: string, ...args: string[]) => {
  const out = Bun.spawnSync(["bun", script, ...args], { cwd, stderr: "pipe", stdout: "pipe" })
  return { code: out.exitCode, stderr: out.stderr.toString() }
}

// The paths a fork drops, read from the starter's own .gitpickignore so the fork case follows the real boundary.
const forkExcludes = (await Bun.file(join(root, ".gitpickignore")).text())
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
const inFork = (file: string) =>
  !forkExcludes.some((path) => (path.endsWith("/") ? file.startsWith(path) : file === path))

// A copy of every file the sync reads, so a hand edit there never touches the checkout.
const withCopy = async (
  body: (dir: string) => Promise<void> | void,
  keep: (file: string) => boolean = () => true,
) => {
  const dir = mkdtempSync(join(tmpdir(), "sync-config-"))
  const files = Bun.spawnSync(
    ["git", "ls-files", "*package.json", "*tsconfig.json", "packages/scripts/src/sync-config/"],
    { cwd: root },
  )
    .stdout.toString()
    .split("\n")
    .filter((file) => file && keep(file))
  for (const file of files) {
    mkdirSync(join(dir, dirname(file)), { recursive: true })
    cpSync(join(root, file), join(dir, file))
  }
  symlinkSync(join(root, "node_modules"), join(dir, "node_modules"))
  try {
    await body(dir)
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
}

describe("sync:config --check", () => {
  test("passes on the synced tree", () => {
    expect(run(root, "--check")).toEqual({ code: 0, stderr: "" })
  })

  test("passes on a fork, which takes neither packages/cli, tests/ nor their patches", () =>
    withCopy((dir) => {
      expect(run(dir, "--check")).toEqual({ code: 0, stderr: "" })
    }, inFork))

  test("fails naming a hand-edited tsconfig", () =>
    withCopy(async (dir) => {
      const file = join(dir, "packages/db/tsconfig.json")
      const config = await Bun.file(file).json()
      config.compilerOptions.strict = false
      await Bun.write(file, JSON.stringify(config, null, 2))
      const { code, stderr } = run(dir, "--check")
      expect(code).toBe(1)
      expect(stderr).toContain("packages/db/tsconfig.json")
      expect(stderr).not.toContain("packages/env/tsconfig.json")
    }))

  test("fails naming a package.json whose type-check dependency went missing", () =>
    withCopy(async (dir) => {
      const file = join(dir, "packages/env/package.json")
      const pkg = await Bun.file(file).json()
      delete pkg.devDependencies.typescript
      await Bun.write(file, JSON.stringify(pkg, null, 2))
      const { code, stderr } = run(dir, "--check")
      expect(code).toBe(1)
      expect(stderr).toContain("packages/env/package.json")
    }))

  test("fails naming a patch that matches no target", () =>
    withCopy(async (dir) => {
      await Bun.write(join(dir, "packages/scripts/src/sync-config/packages-gone.json"), "{}")
      const { code, stderr } = run(dir, "--check")
      expect(code).toBe(1)
      expect(stderr).toContain("packages/scripts/src/sync-config/packages-gone.json")
    }))
})

describe("sync:config", () => {
  test("rewrites a drifted file from the template and its patch, null removing a key", () =>
    withCopy(async (dir) => {
      await Bun.write(
        join(dir, "packages/scripts/src/sync-config/packages-cli.json"),
        JSON.stringify({ tsconfig: { compilerOptions: { paths: null, types: ["node"] } } }),
      )
      const file = join(dir, "packages/cli/tsconfig.json")
      await Bun.write(file, JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }))
      expect(run(dir).code).toBe(0)
      const written = await Bun.file(file).json()
      expect(written.extends).toBe("@packages/config/tsconfig.json")
      expect(written.compilerOptions).toEqual({ types: ["node"] })
      expect(run(dir, "--check")).toEqual({ code: 0, stderr: "" })
    }))
})
