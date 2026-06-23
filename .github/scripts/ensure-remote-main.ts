import { execFileSync } from "node:child_process"

// Pre-push guard: on a fork's first push, publish main + canary so auto-canary-into-main opens the release PR, make canary the default branch, and surface the one manual step (Actions permissions). A per-remote git-config marker makes it a no-op afterward; shared via lefthook.yml so it runs here and in every fork.

// Per-remote, local-only marker; the remote is sanitized and prefixed so the key is always a valid git-config name.
export const markerKey = (remote: string): string => {
  const safe = remote.replace(/[^A-Za-z0-9-]/g, "-")
  return `zerostarter.mainSeeded.${/^[A-Za-z]/.test(safe) ? safe : `r-${safe}`}`
}

const git = (args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()

// The repo's Actions settings URL from a GitHub remote URL (SSH or HTTPS); "" when not GitHub.
export const settingsUrl = (remoteUrl: string): string => {
  const m = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/)
  return m ? `https://github.com/${m[1]}/${m[2]}/settings/actions` : ""
}

// "owner/repo" from a GitHub remote URL (for gh commands); "" when not GitHub.
export const repoSlug = (remoteUrl: string): string => {
  const m = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/)
  return m ? `${m[1]}/${m[2]}` : ""
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

const hasLocalBranch = (name: string): boolean => {
  try {
    git(["rev-parse", "--verify", "--quiet", `refs/heads/${name}`])
    return true
  } catch {
    return false
  }
}

// Push a local branch to the remote, skipping hooks (no recursion) and showing git's progress.
const pushBranch = (remote: string, branch: string): void => {
  execFileSync("git", ["push", "--no-verify", remote, branch], {
    stdio: ["ignore", "inherit", "inherit"],
  })
}

// Make canary the default branch (it is the dev branch and PR target). Best-effort via gh; prints guidance if gh is unavailable.
const setDefaultToCanary = (remote: string): void => {
  let slug = ""
  try {
    slug = repoSlug(git(["remote", "get-url", remote]))
  } catch {
    slug = ""
  }
  if (slug) {
    try {
      execFileSync("gh", ["repo", "edit", slug, "--default-branch", "canary"], { stdio: "ignore" })
      console.error(`zerostarter: set the default branch to canary on ${slug}.`)
      return
    } catch {
      // gh missing or not authorized; fall through to guidance
    }
  }
  console.error(
    "zerostarter: could not set the default branch automatically; set it to canary so pull requests target it (gh repo edit --default-branch canary).",
  )
}

const ensureRemoteMain = (remote: string): void => {
  if (seeded(remote)) return
  if (!hasLocalBranch("main")) return

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

  // First publish: push main first so it exists, then canary so auto-canary-into-main opens the release PR.
  console.error(
    `zerostarter: publishing main and canary to ${remote} so the release PR can open ...`,
  )
  try {
    pushBranch(remote, "main")
    if (hasLocalBranch("canary")) pushBranch(remote, "canary")
  } catch {
    console.error(
      `zerostarter: could not push automatically. Push them yourself: git push ${remote} canary main`,
    )
    return // do not mark; let the original push proceed so nothing is blocked
  }
  markSeeded(remote)
  setDefaultToCanary(remote)

  // The one thing we cannot set for you: the Actions token cannot grant itself write access.
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
