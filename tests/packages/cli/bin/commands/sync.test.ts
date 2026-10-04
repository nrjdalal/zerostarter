import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { stripVTControlCharacters } from "node:util"

import { reportReconcile, sync } from "../../../../../packages/cli/bin/commands/sync"
import {
  emptyReconcile,
  type GuideReconcile,
  type SkillReconcile,
} from "../../../../../packages/cli/src/skills"

let dir: string
const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8" })

// A repo with one committed file, the state sync accepts.
const committedRepo = (): void => {
  git("init", "-q", "-b", "canary")
  git("config", "user.email", "t@t")
  git("config", "user.name", "t")
  writeFileSync(join(dir, "mine.txt"), "committed")
  git("add", "-A")
  git("commit", "-q", "-m", "init")
}

// Run `fn` and return what it printed (help goes through console.log, the flow through process.stdout.write) and what it threw.
const capture = async (fn: () => unknown): Promise<{ error: string; out: string }> => {
  const chunks: string[] = []
  const write = process.stdout.write
  const log = console.log
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(String(chunk))
    return true
  }) as typeof process.stdout.write
  console.log = (...parts: unknown[]) => {
    chunks.push(`${parts.join(" ")}\n`)
  }
  let error = ""
  try {
    await fn()
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  } finally {
    process.stdout.write = write
    console.log = log
  }
  return { error, out: stripVTControlCharacters(chunks.join("")) }
}

const report = async (skills: Partial<SkillReconcile>, guide: GuideReconcile = "adopted") =>
  (await capture(() => reportReconcile({ ...emptyReconcile(), ...skills }, guide))).out

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zs-sync-"))
})
afterEach(() => {
  rmSync(dir, { force: true, recursive: true })
})

describe("sync refuses before it fetches or overlays anything", () => {
  test("--help prints the usage and returns before the repo guard", async () => {
    const { error, out } = await capture(() => sync([dir, "--help"]))
    expect(error).toBe("")
    expect(out).toContain("bunx zerostarter sync [dir]")
  })

  test("a directory with no git repository is refused", async () => {
    const { error, out } = await capture(() => sync([dir]))
    expect(error).toContain("Run sync inside an existing fork")
    expect(out).toBe("")
  })

  test("an uncommitted edit is refused, so the sync can land as its own diff", async () => {
    committedRepo()
    writeFileSync(join(dir, "mine.txt"), "edited")
    const { error, out } = await capture(() => sync([dir]))
    expect(error).toContain("uncommitted changes")
    expect(out).toBe("")
    expect(readFileSync(join(dir, "mine.txt"), "utf8")).toBe("edited")
  })
})

describe("the reconcile report", () => {
  test("says nothing when every skill and the guide took the update", async () => {
    expect(await report({ adopted: ["dev"] })).toBe("")
    expect(await report({}, "absent")).toBe("")
  })

  test("names the skills the fork owns, in the singular for one", async () => {
    const out = await report({ forkOwned: ["brand"] })
    expect(out).toContain("Left 1 skill you own untouched:")
    expect(out).toContain(".agents/skills/brand/SKILL.md")
  })

  test("warns about customized skills and says how to take upstream's", async () => {
    const out = await report({ customized: ["design", "dev"] })
    expect(out).toContain("Kept your edits to 2 skills, so they did not take the update:")
    expect(out).toContain(".agents/skills/design/SKILL.md")
    expect(out).toContain(".agents/skills/dev/SKILL.md")
    expect(out).toContain("delete the skill directory and sync again")
  })

  test("tells an edited guide from a guide the fork wrote itself", async () => {
    const customized = await report({}, "customized")
    expect(customized).toContain("Kept your AGENTS.md, which you have edited")
    expect(customized).not.toContain("full agent guide")

    const forkOwned = await report({}, "forkOwned")
    expect(forkOwned).toContain("The starter now ships its full agent guide")
    expect(forkOwned).not.toContain("which you have edited")
  })

  test("names skills updated with no sync record and how to restore one", async () => {
    const out = await report({ unverified: ["release"] })
    expect(out).toContain("Updated 1 skill with no sync record")
    expect(out).toContain(".agents/skills/release/SKILL.md")
    expect(out).toContain("git restore --source=HEAD -- .agents/skills/<name>/SKILL.md")
  })
})
