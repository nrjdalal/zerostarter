import { join } from "node:path"

import { exists } from "@/io"
import { ok, run, runTail } from "@/spawn"

// Install dependencies in `dir`, showing a rolling window of bun's output that collapses to its summary line ("N packages installed [time]"). Runs the fork's lifecycle scripts (git hooks via prepare, catalog sync) as a normal `bun install` would.
export const bunInstall = async (dir: string): Promise<void> => {
  await runTail("bun", ["install"], {
    cwd: dir,
    summarize: (out) =>
      (out.match(/[\d,]+ packages installed[^\n]*/g) ?? out.match(/Checked [^\n]*install[^\n]*/g))
        ?.at(-1)
        ?.trim() ?? "Dependencies installed.",
  })
}

// Last-resort probe that bun is on PATH (injectable so tests can force either branch); rejects when bun is absent.
const bunOnPath = async (): Promise<void> => {
  if (!(await ok("bun", ["--version"]))) throw new Error("bun is not on PATH")
}

// Whether bun is usable. Trusts two signals before spawning, because a bare `bun --version` can misfire even when bun is present (notably on Windows): running under the Bun runtime (bunx --bun / bun run) and being invoked via bunx (npm_config_user_agent starts with "bun/") both guarantee bun. Only when neither holds do we fall back to the spawn probe. All three inputs default to the live process and are injectable for tests.
export const bunAvailable = async (
  probe: () => void | Promise<void> = bunOnPath,
  bunRuntime: boolean = Boolean(process.versions.bun),
  userAgent: string = process.env.npm_config_user_agent || "",
): Promise<boolean> => {
  if (bunRuntime) return true
  if (userAgent.startsWith("bun/")) return true
  try {
    await probe()
    return true
  } catch {
    return false
  }
}

// Fetch the latest zerostarter scaffold into `dir` (a gitpick subtree overlay, no .git history). --bun runs gitpick under the Bun runtime, not Node.
export const fetchZerostarter = async (dir: string, ref = "main"): Promise<void> => {
  await run("bunx", [
    "--bun",
    "gitpick@6.0.0",
    `https://github.com/nrjdalal/zerostarter/tree/${ref}`,
    dir,
  ])
}

// Overlay the latest zerostarter onto a fork (gitpick -o); .gitpickignore paths and fork-added files are kept.
export const overlayZerostarter = async (dir: string, ref = "main"): Promise<void> => {
  await run("bunx", [
    "--bun",
    "gitpick@6.0.0",
    `https://github.com/nrjdalal/zerostarter/tree/${ref}`,
    dir,
    "-o",
  ])
}

// Read the starter's .gitpickignore from GitHub (gitpick never copies it into a fork).
export const fetchGitpickignore = async (ref = "main"): Promise<string> => {
  const url = `https://raw.githubusercontent.com/nrjdalal/zerostarter/${ref}/.gitpickignore`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch .gitpickignore from ${ref} (HTTP ${res.status}).`)
  return res.text()
}

// True when `dir`'s git working tree has no uncommitted changes.
export const gitIsClean = async (dir: string): Promise<boolean> =>
  (await run("git", ["status", "--porcelain"], dir)).trim() === ""

// Restore each path in `dir` to its committed state (binary-safe) and remove any untracked files under it; skips a path the fork does not track.
export const gitRestore = async (dir: string, paths: string[]): Promise<void> => {
  for (const path of paths) {
    try {
      await run("git", ["checkout", "--", path], dir)
      // drop overlay-added files the fork does not track (e.g. a starter migration under a preserved dir)
      await run("git", ["clean", "-fd", "--", path], dir)
    } catch {
      // not tracked in the fork; keep the overlaid version
    }
  }
}

// Discard all working-tree changes and untracked files in `dir`, returning it to its last commit.
export const gitResetHard = async (dir: string): Promise<void> => {
  await run("git", ["reset", "--hard", "HEAD"], dir)
  await run("git", ["clean", "-fd"], dir)
}

// Guard a destructive command: throw if `dir` is not a git repo, or if its tree has uncommitted changes.
export const requireCleanRepo = async (
  dir: string,
  notGitMsg: string,
  dirtyMsg: string,
): Promise<void> => {
  if (!exists(join(dir, ".git"))) throw new Error(notGitMsg)
  if (!(await gitIsClean(dir))) throw new Error(dirtyMsg)
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
    await gitResetHard(dir)
    console.log(onFail)
    throw err
  }
}

// Start a fresh git repo in `dir` on the `canary` working branch (no commit yet).
export const gitInit = async (dir: string): Promise<void> => {
  await run("git", ["init", "-q", "-b", "canary"], dir)
}

// Create a branch at the current HEAD without checking it out (used to seed `main` from the scaffold commit).
export const gitBranch = async (dir: string, name: string): Promise<void> => {
  await run("git", ["branch", name], dir)
}

// Stage everything and commit, bypassing hooks; no-op if there is nothing to commit.
export const gitCommitAll = async (dir: string, message: string): Promise<void> => {
  await run("git", ["add", "-A"], dir)
  try {
    await run("git", ["commit", "--no-verify", "-q", "-m", message], dir)
  } catch {
    // nothing to commit
  }
}
