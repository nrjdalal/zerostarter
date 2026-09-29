import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { stripVTControlCharacters } from "node:util"

import { nextSteps, reinit } from "../../../../../packages/cli/bin/commands/reinit"

let dir: string
const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8" })

// A repo with one committed file, the state reinit accepts.
const committedRepo = (): void => {
  git("init", "-q", "-b", "canary")
  git("config", "user.email", "t@t")
  git("config", "user.name", "t")
  writeFileSync(join(dir, "mine.txt"), "committed")
  git("add", "-A")
  git("commit", "-q", "-m", "init")
}

// Run the command and return what it printed (help goes through console.log, the flow through process.stdout.write) and what it threw.
const run = async (argv: string[]): Promise<{ error: string; out: string }> => {
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
    await reinit(argv)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
  } finally {
    process.stdout.write = write
    console.log = log
  }
  return { error, out: stripVTControlCharacters(chunks.join("")) }
}

const plain = (lines: string[]) => lines.map((line) => stripVTControlCharacters(line))

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zs-reinit-"))
})
afterEach(() => {
  rmSync(dir, { force: true, recursive: true })
})

describe("reinit refuses before it deletes anything", () => {
  test("--help prints the usage and returns before the repo guard", async () => {
    writeFileSync(join(dir, "mine.txt"), "not a repo")
    const { error, out } = await run([dir, "--help"])
    expect(error).toBe("")
    expect(out).toContain("bunx zerostarter reinit [dir]")
    expect(readFileSync(join(dir, "mine.txt"), "utf8")).toBe("not a repo")
  })

  test("a directory with no git repository is refused and points at init", async () => {
    writeFileSync(join(dir, "mine.txt"), "not a repo")
    const { error, out } = await run([dir, "--yes"])
    expect(error).toContain("use init for a new project")
    expect(out).toBe("")
    expect(readFileSync(join(dir, "mine.txt"), "utf8")).toBe("not a repo")
  })

  test("an uncommitted edit is refused, since the wipe could not bring it back", async () => {
    committedRepo()
    writeFileSync(join(dir, "mine.txt"), "edited")
    const { error, out } = await run([dir, "--yes"])
    expect(error).toContain("uncommitted changes")
    expect(out).toBe("")
    expect(readFileSync(join(dir, "mine.txt"), "utf8")).toBe("edited")
  })

  test("an untracked file is refused too", async () => {
    committedRepo()
    writeFileSync(join(dir, "new.txt"), "untracked")
    const { error, out } = await run([dir, "--yes"])
    expect(error).toContain("uncommitted changes")
    expect(out).toBe("")
    expect(readFileSync(join(dir, "new.txt"), "utf8")).toBe("untracked")
  })
})

describe("reinit next steps", () => {
  test("ask for a database URL first while .env has none", () => {
    expect(plain(nextSteps(false))).toEqual([
      "set POSTGRES_URL in .env",
      "bun run db:migrate",
      "bun run dev",
      "git push",
    ])
  })

  test("skip the URL step once .env sets one", () => {
    expect(plain(nextSteps(true))).toEqual(["bun run db:migrate", "bun run dev", "git push"])
  })
})
