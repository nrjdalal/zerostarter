import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { lint } from "../../../../packages/scripts/src/commit-msg"
import { CASES } from "./commit-msg.cases"

const script = join(import.meta.dir, "../../../../packages/scripts/src/commit-msg.ts")
const rules = (lines: string[]) => lines.map((line) => line.match(/\[([\w-]+)\]$/)![1]).sort()

describe("lint holds config-conventional's 12 rules as commitlint reads them", () => {
  for (const row of CASES)
    test(row.name, () => {
      const verdict = lint(row.message)
      expect(rules(verdict.errors)).toEqual([...row.errors].sort())
      expect(rules(verdict.warnings)).toEqual([...(row.warnings ?? [])].sort())
    })

  test("a comment char other than # is read as git sets it", () => {
    expect(lint("feat: a\n\n; " + "x".repeat(120), ";").errors).toEqual([])
    expect(rules(lint("feat: a\n\n; " + "x".repeat(120)).errors)).toEqual(["body-max-line-length"])
  })
})

describe("the hook", () => {
  const run = (message: string) => {
    const dir = mkdtempSync(join(tmpdir(), "commit-msg-"))
    try {
      const file = join(dir, "COMMIT_EDITMSG")
      writeFileSync(file, message)
      const out = Bun.spawnSync([process.execPath, script, file], { cwd: dir, stderr: "pipe" })
      return { code: out.exitCode, stderr: out.stderr.toString() }
    } finally {
      rmSync(dir, { force: true, recursive: true })
    }
  }

  test("exits 1 naming each failed rule, and 0 on a good message", () => {
    const bad = run("Feat: Add a page.")
    expect(bad.code).toBe(1)
    expect(bad.stderr).toContain("[type-case]")
    expect(bad.stderr).toContain("[subject-full-stop]")
    expect(run("feat: add a page\n").code).toBe(0)
  })

  test("a warning alone exits 0", () => {
    const warned = run("feat: a\nbody right under")
    expect(warned.code).toBe(0)
    expect(warned.stderr).toContain("[body-leading-blank]")
  })
})
