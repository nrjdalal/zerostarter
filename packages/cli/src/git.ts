import { execFileSync } from "node:child_process"

const run = (cmd: string, args: string[], cwd?: string): string =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

// Fetch the latest zerostarter scaffold into `dir` (a gitpick subtree overlay, no .git history).
export const fetchZerostarter = (dir: string, ref = "main"): void => {
  run("bunx", ["gitpick", `https://github.com/nrjdalal/zerostarter/tree/${ref}`, dir])
}

// Detect "owner/repo" from the dir's origin remote, if it has one.
export const detectRepo = (dir: string): { owner: string; repo: string } | null => {
  try {
    const url = run("git", ["remote", "get-url", "origin"], dir).trim()
    const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/)
    if (match) return { owner: match[1], repo: match[2] }
  } catch {
    // no remote
  }
  return null
}

// Start a fresh git repo in `dir` (no commit yet).
export const gitInit = (dir: string): void => {
  run("git", ["init", "-q"], dir)
}

// Stage everything and commit. No-op if there is nothing to commit (e.g. a re-run).
export const gitCommitAll = (dir: string, message: string): void => {
  run("git", ["add", "-A"], dir)
  try {
    run("git", ["commit", "-q", "-m", message], dir)
  } catch {
    // nothing to commit
  }
}
