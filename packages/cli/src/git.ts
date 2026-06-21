import { execFileSync } from "node:child_process"

const run = (cmd: string, args: string[], cwd?: string): string =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })

// Fetch the latest zerostarter scaffold into `dir` (a gitpick subtree overlay, no .git history).
export const fetchZerostarter = (dir: string, ref = "main"): void => {
  run("bunx", ["gitpick@5.4.1", `https://github.com/nrjdalal/zerostarter/tree/${ref}`, dir])
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
