import { afterEach, beforeEach, expect, test } from "bun:test"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const scripts = join(import.meta.dir, "../../../../packages/scripts/src")
const script = join(scripts, "shadcn-update.ts")

let dir: string
let bin: string
let log: string

// Stand-ins for bun and bunx that log each call, so the test sees the sync's steps without reaching npm or rewriting a real tree. The script itself runs on the real bun, by its full path.
const stub = (name: string) => {
  const path = join(bin, name)
  writeFileSync(
    path,
    `#!${process.execPath}\nimport { appendFileSync } from "node:fs"\nappendFileSync(process.env.STUB_LOG!, JSON.stringify({ cmd: ${JSON.stringify(name)}, args: process.argv.slice(2), cwd: process.cwd() }) + "\\n")\nif (process.env.STUB_FAIL && process.argv.includes(process.env.STUB_FAIL)) process.exit(3)\n`,
  )
  chmodSync(path, 0o755)
}

const git = (...args: string[]) => Bun.spawnSync(["git", ...args], { cwd: dir })

const file = (path: string, text = "") => {
  mkdirSync(join(dir, dirname(path)), { recursive: true })
  writeFileSync(join(dir, path), text)
}

const run = async (extra: Record<string, string> = {}) => {
  const out = Bun.spawnSync([process.execPath, script], {
    cwd: dir,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, STUB_LOG: log, ...extra },
    stderr: "pipe",
  })
  const text = existsSync(log) ? await Bun.file(log).text() : ""
  const calls = text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { args: string[]; cmd: string; cwd: string })
  return { calls, code: out.exitCode, stderr: out.stderr.toString() }
}

beforeEach(() => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), "shadcn-update-")))
  bin = mkdtempSync(join(tmpdir(), "shadcn-update-bin-"))
  log = join(bin, "calls.jsonl")
  stub("bun")
  stub("bunx")
  git("init", "-q")
  file("package.json", "{}\n")
  file("web/next/components.json", "{}\n")
  file("web/next/src/components/ui/button.tsx", "export {}\n")
  git("add", ".")
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "init")
})

afterEach(() => {
  rmSync(dir, { force: true, recursive: true })
  rmSync(bin, { force: true, recursive: true })
})

test("stops before touching anything when a path the sync rewrites has uncommitted changes", async () => {
  file("web/next/components.json", '{ "edited": true }\n')
  const { calls, code, stderr } = await run()
  expect(code).toBe(1)
  expect(stderr).toContain("uncommitted changes")
  expect(stderr).toContain("web/next/components.json")
  expect(calls).toEqual([])
  expect(existsSync(join(dir, "web/next/src/components/ui/button.tsx"))).toBe(true)
})

// The stubs are shebang scripts found through a colon-joined PATH, which Windows can neither exec nor split, so the stubbed runs hold on posix alone.
const canExecStubs = process.platform !== "win32"

test.skipIf(!canExecStubs)(
  "rescaffolds shadcn in web/next, then customizes and formats from the root",
  async () => {
    const { calls, code, stderr } = await run()
    expect(stderr).toBe("")
    expect(code).toBe(0)
    expect(existsSync(join(dir, "web/next/components.json"))).toBe(false)
    expect(existsSync(join(dir, "web/next/src/components/ui"))).toBe(false)
    const web = join(dir, "web/next")
    expect(calls).toEqual([
      {
        args: [
          "shadcn@latest",
          "init",
          "--template",
          "next",
          "--preset",
          "a16C8",
          "--base",
          "base",
        ],
        cmd: "bunx",
        cwd: web,
      },
      { args: ["shadcn@latest", "add", "-a"], cmd: "bunx", cwd: web },
      { args: [join(scripts, "shadcn-customize.ts")], cmd: "bun", cwd: dir },
      { args: ["run", "format"], cmd: "bun", cwd: dir },
    ])
  },
)

test.skipIf(!canExecStubs)("stops at the first step that fails", async () => {
  const { calls, code } = await run({ STUB_FAIL: "init" })
  expect(code).toBe(3)
  expect(calls.map((c) => c.args[1])).toEqual(["init"])
})
