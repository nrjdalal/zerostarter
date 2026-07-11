import { execFileSync } from "node:child_process"

// Pre-push guard for fresh forks, GitHub remotes only (other remotes are left alone). The user's first `git push origin canary` creates canary, which GitHub makes the default branch; on the next push the hook seeds the release branches (main by default, from RELEASE_BRANCHES) as separate refs, so they never collide with the canary push, so auto-canary-into-main opens the release PR. No gh or repo-admin is needed: the default branch falls out of push order. A per-branch, per-remote git-config marker makes it a no-op once done; shared via lefthook.yml so it runs here and in every fork.

// Per-branch, per-remote local-only marker; the remote is sanitized and prefixed so the key is always a valid git-config name.
export const markerKey = (branch: string, remote: string): string => {
  const safe = remote.replace(/[^A-Za-z0-9-]/g, "-")
  return `zerostarter.seeded.${branch}.${/^[A-Za-z]/.test(safe) ? safe : `r-${safe}`}`
}

const git = (args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()

// The repo's Actions settings URL from a GitHub remote URL (SSH or HTTPS); "" when not GitHub.
export const settingsUrl = (remoteUrl: string): string => {
  const m = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/)
  return m ? `https://github.com/${m[1]}/${m[2]}/settings/actions` : ""
}

// "owner/repo" from a GitHub remote URL; "" when not GitHub. Used to detect GitHub remotes.
export const repoSlug = (remoteUrl: string): string => {
  const m = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/)
  return m ? `${m[1]}/${m[2]}` : ""
}

const done = (branch: string, remote: string): boolean => {
  try {
    return git(["config", "--local", "--get", markerKey(branch, remote)]) === "true"
  } catch {
    return false
  }
}

const markDone = (branch: string, remote: string): void => {
  try {
    git(["config", "--local", markerKey(branch, remote), "true"])
  } catch {
    // best-effort: a missing marker only costs an extra ls-remote on the next push
  }
}

const hasLocalBranch = (name: string): boolean => {
  try {
    git(["rev-parse", "--verify", "--quiet", `refs/heads/${name}`])
    return true
  } catch {
    return false
  }
}

const remoteUrl = (remote: string): string => {
  try {
    return git(["remote", "get-url", remote])
  } catch {
    return ""
  }
}

// true/false when the remote is reachable, null when it is not (so the caller can skip without blocking the push).
const remoteHasBranch = (remote: string, branch: string): boolean | null => {
  try {
    return git(["ls-remote", "--heads", remote, branch]) !== ""
  } catch {
    return null
  }
}

// Orange + OSC 8 hyperlink for the settings URL, matching the CLI palette; plain text when stderr is not a TTY.
const orange = (s: string): string => (process.stderr.isTTY ? `\x1b[38;5;208m${s}\x1b[0m` : s)
const link = (url: string): string =>
  process.stderr.isTTY ? `\x1b]8;;${url}\x07${orange(url)}\x1b]8;;\x07` : url

// Print the one manual step the Actions token cannot do for the user: grant itself write access.
const printPermsInstructions = (remote: string): void => {
  const url = settingsUrl(remoteUrl(remote))
  console.error(
    "zerostarter: enable read-write Actions permissions so the release workflow can run:",
  )
  console.error(`  1. Open ${url ? link(url) : "your repo's Settings -> Actions -> General"}`)
  console.error('  2. Under "Workflow permissions", select "Read and write permissions"')
  console.error('  3. Check "Allow GitHub Actions to create and approve pull requests"')
  console.error("  4. Click Save")
}

// The long-lived branches this hook seeds on a fresh GitHub remote once canary exists. Default is just main, which drives the canary -> main release PR; a fork can add more (e.g. "staging", "production").
const RELEASE_BRANCHES = ["main"]

const ensureRemoteBranches = (remote: string): void => {
  if (!repoSlug(remoteUrl(remote))) return // not a GitHub remote: the release flow does not apply, so do not interfere

  // Declared branches that exist locally and are not yet marked seeded for this remote.
  const pending = RELEASE_BRANCHES.filter(
    (branch) => hasLocalBranch(branch) && !done(branch, remote),
  )
  if (pending.length === 0) return

  const canaryOnRemote = remoteHasBranch(remote, "canary")
  if (canaryOnRemote === null) return // remote unreachable: never block the push, retry next time

  if (!canaryOnRemote) {
    // This push creates canary, which GitHub makes the default branch. The release branches are seeded on the next push.
    console.error(
      "zerostarter: publishing canary; it becomes your default branch. Push again to seed the release branches and open the release PR.",
    )
    printPermsInstructions(remote)
    return // not done; the release branches are seeded on the next push
  }

  // canary exists: seed each pending branch (a different ref, so no collision with the canary push) so the release PR can open.
  for (const branch of pending) {
    const onRemote = remoteHasBranch(remote, branch)
    if (onRemote === null) return // remote went unreachable mid-loop: retry next push
    if (onRemote) {
      markDone(branch, remote) // already on the remote; nothing to push
      continue
    }
    console.error(
      `zerostarter: seeding ${branch} on ${remote} so the canary -> ${branch} release PR can open ...`,
    )
    try {
      execFileSync("git", ["push", "--no-verify", remote, branch], {
        stdio: ["ignore", "inherit", "inherit"],
      })
    } catch {
      console.error(
        `zerostarter: could not push ${branch} automatically. Push it yourself: git push ${remote} ${branch}`,
      )
      return // do not mark; let the canary push proceed so nothing is blocked
    }
    markDone(branch, remote)
  }
}

if (import.meta.main) ensureRemoteBranches(process.argv[2] || "origin")
