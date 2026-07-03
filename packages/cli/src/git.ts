import { execFileSync } from "node:child_process"

const run = (cmd: string, args: string[], cwd?: string): string =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

// Fetch the latest zerostarter scaffold into `dir` (a gitpick subtree overlay, no .git history).
export const fetchZerostarter = (dir: string, ref = "main"): void => {
  run("bunx", ["gitpick@5.5.0", `https://github.com/nrjdalal/zerostarter/tree/${ref}`, dir])
}

// Overlay the latest zerostarter onto an existing fork, overwriting starter files. Files the
// fork added are untouched, and paths in the starter's .gitpickignore (content, public/marketing,
// site.ts, ...) are never fetched, so the fork's product and branding survive.
export const overlayZerostarter = (dir: string, ref = "main"): void => {
  run("bunx", ["gitpick@5.5.0", `https://github.com/nrjdalal/zerostarter/tree/${ref}`, dir, "-o"])
}

// Read the starter's .gitpickignore from GitHub. gitpick never copies it into a fork (it excludes
// itself), so sync fetches it directly to read the PRESERVE_ON_SYNC directive.
export const fetchGitpickignore = async (ref = "main"): Promise<string> => {
  const url = `https://raw.githubusercontent.com/nrjdalal/zerostarter/${ref}/.gitpickignore`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch .gitpickignore from ${ref} (HTTP ${res.status}).`)
  return res.text()
}

// True when `dir`'s git working tree has no uncommitted changes.
export const gitIsClean = (dir: string): boolean =>
  run("git", ["status", "--porcelain"], dir).trim() === ""

// Restore the committed version of specific paths in `dir` (keeps fork-owned assets, e.g. a
// custom favicon, after an overlay overwrote them). Binary-safe; skips a path the fork does not
// track, so a fresh fork keeps the overlaid default instead.
export const gitRestore = (dir: string, paths: string[]): void => {
  for (const path of paths) {
    try {
      run("git", ["checkout", "--", path], dir)
    } catch {
      // not tracked in the fork; keep the overlaid version
    }
  }
}

// Discard all working-tree changes and untracked files in `dir`, returning it to its last commit.
// Used to roll a partial sync back to the pre-sync state (safe: sync requires a clean tree first).
export const gitResetHard = (dir: string): void => {
  run("git", ["reset", "--hard", "HEAD"], dir)
  run("git", ["clean", "-fd"], dir)
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

// Stage everything and commit, bypassing the fork's hooks (bun install may have installed
// lefthook in the scaffold). No-op if there is nothing to commit (e.g. a re-run).
export const gitCommitAll = (dir: string, message: string): void => {
  run("git", ["add", "-A"], dir)
  try {
    run("git", ["commit", "--no-verify", "-q", "-m", message], dir)
  } catch {
    // nothing to commit
  }
}
