import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

// The labeler is inline JavaScript in a workflow, so this lifts the mapping out of the YAML and runs it against this checkout, the way the job runs it against the base branch. Anything that reshapes the script has to keep these two anchors.
const root = join(import.meta.dir, "../../..")
const yml = readFileSync(join(root, ".github/workflows/auto-labeler.yml"), "utf8")
const slice = (from: string, to: string): string => {
  const start = yml.indexOf(from)
  const end = yml.indexOf(to)
  if (start === -1 || end === -1) throw new Error(`anchor missing: ${from} .. ${to}`)
  return yml
    .slice(start, end)
    .split("\n")
    .map((line) => line.replace(/^ {12}/, ""))
    .join("\n")
}
const source =
  slice("const { execFileSync }", "const { number: prNumber }") +
  slice("const getLabelForFile", "const ensureLabel")

type Mapper = (filePath: string, packageMap: Map<string, string>) => string | null
const load = (): Mapper =>
  new Function("require", `${source}; return getLabelForFile`)(
    createRequire(import.meta.url),
  ) as Mapper

const packageMap = new Map([
  ["api/hono", "@api/hono"],
  ["packages/cli", "@zerostarter"],
  ["web/next", "@web/next"],
])

describe("auto-labeler getLabelForFile", () => {
  // git answers relative to the working directory, which is the repo root under `bun run test`; an untracked top-level directory stands in for install output the checkout carries.
  const untracked = join(root, "untracked-probe-for-labeler-test")
  let getLabelForFile: Mapper
  beforeAll(() => {
    process.chdir(root)
    mkdirSync(untracked, { recursive: true })
    writeFileSync(join(untracked, "x.txt"), "")
    getLabelForFile = load()
  })
  afterAll(() => {
    rmSync(untracked, { force: true, recursive: true })
  })

  test("labels a file by the directory the base branch tracks", () => {
    expect(getLabelForFile("tests/packages/cli/src/convert.test.ts", packageMap)).toBe("@tests")
    expect(getLabelForFile(".agents/skills/dev/SKILL.md", packageMap)).toBe("@.agents")
    expect(getLabelForFile("api/hono/src/index.ts", packageMap)).toBe("@api/hono")
    expect(getLabelForFile(".github/workflows/x.yml", packageMap)).toBe("@workflows")
    expect(getLabelForFile(".github/scripts/x.ts", packageMap)).toBe("@scripts")
  })

  test("keeps the fixed labels for dependency, docker and root files", () => {
    expect(getLabelForFile("bun.lock", packageMap)).toBe("@dependencies")
    expect(getLabelForFile("Dockerfile", packageMap)).toBe("@docker")
    expect(getLabelForFile("README.md", packageMap)).toBe("@misc")
  })

  test("never mints a label from a directory the base branch does not track", () => {
    // A fork's file list is the contributor's; under pull_request_target the token can create labels.
    expect(getLabelForFile("zzz-spam/x.txt", packageMap)).toBe("@misc")
    expect(getLabelForFile("evil/../../x", packageMap)).toBe("@misc")
    expect(getLabelForFile("node_modules/evil/x.js", packageMap)).toBe("@misc")
    expect(getLabelForFile("untracked-probe-for-labeler-test/x.txt", packageMap)).toBe("@misc")
  })

  test("reads a glob-looking directory name as a name, not a pathspec", () => {
    // `git ls-files -- '*'` would have matched everything and minted @*.
    expect(getLabelForFile("*/x", packageMap)).toBe("@misc")
    expect(getLabelForFile("[a-z]*/x", packageMap)).toBe("@misc")
    expect(getLabelForFile("**/x", packageMap)).toBe("@misc")
  })
})
