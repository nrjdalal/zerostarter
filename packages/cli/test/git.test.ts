import { afterEach, beforeEach, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  bunAvailable,
  gitBranch,
  gitCommitAll,
  gitInit,
  gitIsClean,
  gitResetHard,
  gitRestore,
} from "@/git"

let dir: string
const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8" })

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "zs-git-"))
  execFileSync("git", ["init", "-q", "-b", "canary"], { cwd: dir })
  git("config", "user.email", "t@t")
  git("config", "user.name", "t")
})
afterEach(() => {
  rmSync(dir, { force: true, recursive: true })
})

test("gitInit starts a repo on the canary branch", () => {
  const fresh = mkdtempSync(join(tmpdir(), "zs-git2-"))
  gitInit(fresh)
  expect(
    execFileSync("git", ["symbolic-ref", "--short", "HEAD"], {
      cwd: fresh,
      encoding: "utf8",
    }).trim(),
  ).toBe("canary")
  rmSync(fresh, { force: true, recursive: true })
})

test("gitIsClean reflects the working tree, including untracked files", () => {
  writeFileSync(join(dir, "a.txt"), "1")
  gitCommitAll(dir, "init")
  expect(gitIsClean(dir)).toBe(true)
  writeFileSync(join(dir, "b.txt"), "2")
  expect(gitIsClean(dir)).toBe(false)
})

test("gitCommitAll stages everything and no-ops on a clean tree", () => {
  writeFileSync(join(dir, "a.txt"), "1")
  gitCommitAll(dir, "one")
  expect(git("log", "--oneline").trim().split("\n")).toHaveLength(1)
  expect(() => gitCommitAll(dir, "empty")).not.toThrow()
  expect(git("log", "--oneline").trim().split("\n")).toHaveLength(1)
})

test("gitBranch creates a branch at HEAD without checking it out", () => {
  writeFileSync(join(dir, "a.txt"), "1")
  gitCommitAll(dir, "init")
  gitBranch(dir, "main")
  expect(git("branch", "--list", "main").trim()).toContain("main")
  expect(git("symbolic-ref", "--short", "HEAD").trim()).not.toBe("main")
})

test("gitRestore restores a committed path and skips an untracked one", () => {
  writeFileSync(join(dir, "keep.txt"), "orig")
  gitCommitAll(dir, "init")
  writeFileSync(join(dir, "keep.txt"), "changed")
  expect(() => gitRestore(dir, ["keep.txt", "never-tracked.txt"])).not.toThrow()
  expect(readFileSync(join(dir, "keep.txt"), "utf8")).toBe("orig")
})

test("gitRestore drops overlay-added untracked files under a preserved dir", () => {
  mkdirSync(join(dir, "db"))
  writeFileSync(join(dir, "db/0000.sql"), "base")
  gitCommitAll(dir, "init")
  // simulate the overlay: overwrite the tracked migration and add a starter one the fork never had
  writeFileSync(join(dir, "db/0000.sql"), "overlaid")
  writeFileSync(join(dir, "db/0001_orphan.sql"), "starter")
  gitRestore(dir, ["db"])
  expect(readFileSync(join(dir, "db/0000.sql"), "utf8")).toBe("base")
  expect(existsSync(join(dir, "db/0001_orphan.sql"))).toBe(false)
})

const fail = () => {
  throw Object.assign(new Error("spawnSync bun ENOENT"), { code: "ENOENT" })
}

test("bunAvailable is true when the probe succeeds, false when it fails", () => {
  // no runtime signal, no bun user-agent → only the probe decides
  expect(bunAvailable(() => {}, false, "")).toBe(true)
  expect(bunAvailable(fail, false, "")).toBe(false)
})

test("bunAvailable trusts the Bun runtime and the bunx user-agent without probing", () => {
  // a failing probe must not matter once a trustworthy signal is present
  expect(bunAvailable(fail, true, "")).toBe(true)
  expect(bunAvailable(fail, false, "bun/1.3.14 npm/? node/v24")).toBe(true)
  // a non-bun user-agent does not count
  expect(bunAvailable(fail, false, "npm/10.8.0 node/v22")).toBe(false)
})

test("gitResetHard restores tracked files, removes untracked, keeps gitignored", () => {
  writeFileSync(join(dir, ".gitignore"), "ignored/\n")
  writeFileSync(join(dir, "src.txt"), "orig")
  gitCommitAll(dir, "init")
  writeFileSync(join(dir, "src.txt"), "changed")
  writeFileSync(join(dir, "new.txt"), "untracked")
  mkdirSync(join(dir, "ignored"))
  writeFileSync(join(dir, "ignored/x"), "keep")

  gitResetHard(dir)

  expect(readFileSync(join(dir, "src.txt"), "utf8")).toBe("orig")
  expect(existsSync(join(dir, "new.txt"))).toBe(false)
  expect(existsSync(join(dir, "ignored/x"))).toBe(true)
})
