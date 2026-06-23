import { execFileSync } from "node:child_process"

// Pre-push guard: make `main` exist on the remote so the first `git push origin canary` brings it
// along, letting `auto-canary-into-main` open the release PR first time (a fork's Actions token
// cannot create branches). Shared via lefthook.yml, so it runs in this repo and every fork alike;
// a local git-config marker makes it a no-op once `main` is on the remote.

const MARKER = "zerostarter.mainSeeded"

const git = (args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()

// The repo's Actions settings URL derived from a GitHub remote URL (SSH or HTTPS); "" when not GitHub.
export const settingsUrl = (remoteUrl: string): string => {
  const m = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/)
  return m ? `https://github.com/${m[1]}/${m[2]}/settings/actions` : ""
}

const seeded = (): boolean => {
  try {
    return git(["config", "--local", "--get", MARKER]) === "true"
  } catch {
    return false
  }
}

const markSeeded = (): void => {
  try {
    git(["config", "--local", MARKER, "true"])
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
  if (seeded()) return
  if (!hasLocalMain()) return

  let remoteMain: string
  try {
    remoteMain = git(["ls-remote", "--heads", remote, "main"])
  } catch {
    return // remote unreachable: skip silently, never block the push, retry next time
  }
  if (remoteMain !== "") {
    markSeeded()
    return
  }

  // First publish: seed `main` so the canary push that follows can open the release PR.
  console.error(
    `zerostarter: pushing main to ${remote} so the canary -> main release PR can open ...`,
  )
  try {
    // --no-verify skips this very hook on the inner push (no recursion); ignore stdin so it does
    // not consume the ref lines git fed to the outer push's hook.
    execFileSync("git", ["push", "--no-verify", remote, "main"], {
      stdio: ["ignore", "inherit", "inherit"],
    })
  } catch {
    console.error(
      `zerostarter: could not push main automatically. Push it yourself: git push ${remote} main`,
    )
    return // do not mark; let the canary push proceed so nothing is blocked
  }
  markSeeded()

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
