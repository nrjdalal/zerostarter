import { execFileSync } from "node:child_process"

// Pre-push guard: publish local `main` when the remote lacks it (first push) so a fork's `git push origin canary` lets auto-canary-into-main open the release PR; shared via lefthook.yml (runs here and in every fork), with a per-remote git-config marker that makes it a no-op afterward.

// Per-remote, local-only marker: seeding one remote must not mark another seeded, and it is per-clone state, so it lives in git config and is never committed.
export const markerKey = (remote: string): string =>
  `zerostarter.mainSeeded.${remote.replace(/[^A-Za-z0-9-]/g, "-")}`

const git = (args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()

// The repo's Actions settings URL derived from a GitHub remote URL (SSH or HTTPS); "" when not GitHub.
export const settingsUrl = (remoteUrl: string): string => {
  const m = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/)
  return m ? `https://github.com/${m[1]}/${m[2]}/settings/actions` : ""
}

const seeded = (remote: string): boolean => {
  try {
    return git(["config", "--local", "--get", markerKey(remote)]) === "true"
  } catch {
    return false
  }
}

const markSeeded = (remote: string): void => {
  try {
    git(["config", "--local", markerKey(remote), "true"])
  } catch {
    // best-effort: a missing marker only costs one extra ls-remote on the next push
  }
}

const hasLocalMain = (): boolean => {
  try {
    git(["rev-parse", "--verify", "--quiet", "refs/heads/main"])
    return true
  } catch {
    return false
  }
}

const ensureRemoteMain = (remote: string): void => {
  if (seeded(remote)) return
  if (!hasLocalMain()) return

  let remoteMain: string
  try {
    remoteMain = git(["ls-remote", "--heads", remote, "main"])
  } catch {
    return // remote unreachable: skip silently, never block the push, retry next time
  }
  if (remoteMain !== "") {
    markSeeded(remote)
    return
  }

  // First publish: seed `main` so the canary push that follows can open the release PR.
  console.error(
    `zerostarter: pushing main to ${remote} so the canary -> main release PR can open ...`,
  )
  try {
    // --no-verify skips this hook on the inner push (no recursion); ignore stdin so it leaves the outer hook's ref lines alone.
    execFileSync("git", ["push", "--no-verify", remote, "main"], {
      stdio: ["ignore", "inherit", "inherit"],
    })
  } catch {
    console.error(
      `zerostarter: could not push main automatically. Push it yourself: git push ${remote} main`,
    )
    return // do not mark; let the canary push proceed so nothing is blocked
  }
  markSeeded(remote)

  let url = ""
  try {
    url = settingsUrl(git(["remote", "get-url", remote]))
  } catch {
    url = ""
  }
  console.error(
    "zerostarter: enable read-write Actions permissions so the release workflow can run:",
  )
  console.error(`  1. Open ${url || "your repo's Settings -> Actions -> General"}`)
  console.error('  2. Under "Workflow permissions", select "Read and write permissions"')
  console.error('  3. Check "Allow GitHub Actions to create and approve pull requests"')
  console.error("  4. Click Save")
}

if (import.meta.main) ensureRemoteMain(process.argv[2] || "origin")
