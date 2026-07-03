import { execFileSync } from "node:child_process"
import { join } from "node:path"

import { exists } from "@/io"

const run = (cmd: string, args: string[], cwd?: string): string =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

// Probe whether the `bun` runtime is on PATH (the default `requireBun` check; injectable so tests can force either branch).
const bunOnPath = (): void => execFileSync("bun", ["--version"], { stdio: "ignore" })

// Verify Bun is available before a command shells out to it. init/reinit/sync run bunx (gitpick), bun install, and bun run db:migrate, so on a machine without Bun the first spawn dies with a cryptic `spawnSync bunx ENOENT`; preflight this to fail fast with install guidance instead. `bunx` is a symlink to `bun`, so checking `bun` covers both.
export const requireBun = (probe: () => void = bunOnPath): void => {
  try {
    probe()
  } catch {
    throw new Error(
      "ZeroStarter needs Bun, but `bun` isn't on your PATH. Install it from https://bun.sh, then re-run with `bunx zerostarter ...` (not `npx`). The CLI shells out to bun and bunx to fetch, install, and migrate.",
    )
  }
}

// Fetch the latest zerostarter scaffold into `dir` (a gitpick subtree overlay, no .git history).
export const fetchZerostarter = (dir: string, ref = "main"): void => {
  run("bunx", ["gitpick@6.0.0", `https://github.com/nrjdalal/zerostarter/tree/${ref}`, dir])
}

// Overlay the latest zerostarter onto a fork (gitpick -o); .gitpickignore paths and fork-added files are kept.
export const overlayZerostarter = (dir: string, ref = "main"): void => {
  run("bunx", ["gitpick@6.0.0", `https://github.com/nrjdalal/zerostarter/tree/${ref}`, dir, "-o"])
}

// Read the starter's .gitpickignore from GitHub (gitpick never copies it into a fork).
export const fetchGitpickignore = async (ref = "main"): Promise<string> => {
  const url = `https://raw.githubusercontent.com/nrjdalal/zerostarter/${ref}/.gitpickignore`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch .gitpickignore from ${ref} (HTTP ${res.status}).`)
  return res.text()
}

// True when `dir`'s git working tree has no uncommitted changes.
export const gitIsClean = (dir: string): boolean =>
  run("git", ["status", "--porcelain"], dir).trim() === ""

// Restore each path in `dir` to its committed state (binary-safe) and remove any untracked files under it; skips a path the fork does not track.
export const gitRestore = (dir: string, paths: string[]): void => {
  for (const path of paths) {
    try {
      run("git", ["checkout", "--", path], dir)
      // drop overlay-added files the fork does not track (e.g. a starter migration under a preserved dir)
      run("git", ["clean", "-fd", "--", path], dir)
    } catch {
      // not tracked in the fork; keep the overlaid version
    }
  }
}

// Discard all working-tree changes and untracked files in `dir`, returning it to its last commit.
export const gitResetHard = (dir: string): void => {
  run("git", ["reset", "--hard", "HEAD"], dir)
  run("git", ["clean", "-fd"], dir)
}

// Guard a destructive command: throw if `dir` is not a git repo, or if its tree has uncommitted changes.
export const requireCleanRepo = (dir: string, notGitMsg: string, dirtyMsg: string): void => {
  if (!exists(join(dir, ".git"))) throw new Error(notGitMsg)
  if (!gitIsClean(dir)) throw new Error(dirtyMsg)
}

// Run `fn`; on any failure roll `dir` back to its pre-run commit, print `onFail`, and rethrow.
export const withRollback = async (
  dir: string,
  onFail: string,
  fn: () => Promise<void> | void,
): Promise<void> => {
  try {
    await fn()
  } catch (err) {
    gitResetHard(dir)
    console.log(onFail)
    throw err
  }
}

// Install dependencies in `dir`, regenerating a clean lockfile for the converted package set.
export const bunInstall = (dir: string): void => {
  run("bun", ["install"], dir)
}

// Start a fresh git repo in `dir` on the `canary` working branch (no commit yet).
export const gitInit = (dir: string): void => {
  run("git", ["init", "-q", "-b", "canary"], dir)
}

// Create a branch at the current HEAD without checking it out (used to seed `main` from the scaffold commit).
export const gitBranch = (dir: string, name: string): void => {
  run("git", ["branch", name], dir)
}

// Stage everything and commit, bypassing hooks; no-op if there is nothing to commit.
export const gitCommitAll = (dir: string, message: string): void => {
  run("git", ["add", "-A"], dir)
  try {
    run("git", ["commit", "--no-verify", "-q", "-m", message], dir)
  } catch {
    // nothing to commit
  }
}
