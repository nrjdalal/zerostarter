import { expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { markerKey, repoSlug, settingsUrl } from "../../../.github/scripts/ensure-remote-branches"

test("settingsUrl builds the Actions settings URL from an SSH remote", () => {
  expect(settingsUrl("git@github.com:acme/widgets.git")).toBe(
    "https://github.com/acme/widgets/settings/actions",
  )
})

test("settingsUrl builds the Actions settings URL from an HTTPS remote", () => {
  expect(settingsUrl("https://github.com/acme/widgets.git")).toBe(
    "https://github.com/acme/widgets/settings/actions",
  )
})

test("settingsUrl handles an HTTPS remote without .git and a trailing slash", () => {
  expect(settingsUrl("https://github.com/acme/widgets/")).toBe(
    "https://github.com/acme/widgets/settings/actions",
  )
})

test("settingsUrl returns empty for a non-GitHub remote", () => {
  expect(settingsUrl("https://gitlab.com/acme/widgets.git")).toBe("")
})

test("markerKey is scoped per branch and remote so seeding one does not mark another", () => {
  expect(markerKey("main", "origin")).toBe("zerostarter.seeded.main.origin")
  expect(markerKey("main", "upstream")).toBe("zerostarter.seeded.main.upstream")
  expect(markerKey("staging", "origin")).toBe("zerostarter.seeded.staging.origin")
})

test("markerKey sanitizes a remote name into a valid git-config key", () => {
  expect(markerKey("main", "feature/fork")).toBe("zerostarter.seeded.main.feature-fork")
})

test("markerKey prefixes a digit-leading remote so the key stays a valid git-config name", () => {
  expect(markerKey("main", "2fork")).toBe("zerostarter.seeded.main.r-2fork")
})

test("repoSlug detects GitHub remotes (SSH and HTTPS) and is empty otherwise", () => {
  expect(repoSlug("git@github.com:acme/widgets.git")).toBe("acme/widgets")
  expect(repoSlug("https://github.com/acme/widgets.git")).toBe("acme/widgets")
  expect(repoSlug("https://gitlab.com/acme/widgets.git")).toBe("")
})

// End to end against a throwaway remote: a local bare repo whose path ends in github.com/acme/widgets.git, which the
// hook's GitHub detection matches, so every real git call runs (remote get-url, rev-parse, ls-remote, push --no-verify)
// and the config marker makes the second run a no-op. An insteadOf rewrite would not do: get-url returns the rewritten URL.
const SCRIPT = join(import.meta.dir, "../../../.github/scripts/ensure-remote-branches.ts")

const sh = (cwd: string, args: string[]): string => {
  const proc = Bun.spawnSync(args, { cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe" })
  if (proc.exitCode !== 0) throw new Error(proc.stderr.toString())
  return proc.stdout.toString().trim()
}

const runHook = (cwd: string): { code: number; stderr: string } => {
  const proc = Bun.spawnSync([process.execPath, SCRIPT, "origin"], {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  return { code: proc.exitCode, stderr: proc.stderr.toString() }
}

test("seeds main on a fresh GitHub remote once canary exists, then no-ops via the marker", () => {
  const root = mkdtempSync(join(tmpdir(), "zerostarter-seed-"))
  try {
    const bare = join(root, "github.com", "acme", "widgets.git")
    const work = join(root, "work")
    sh(root, ["git", "init", "--bare", "-q", bare])
    sh(root, ["git", "init", "-q", "-b", "canary", work])
    sh(work, ["git", "config", "user.email", "t@example.com"])
    sh(work, ["git", "config", "user.name", "t"])
    sh(work, ["git", "commit", "-q", "--allow-empty", "-m", "init"])
    sh(work, ["git", "remote", "add", "origin", bare])
    sh(work, ["git", "push", "-q", "origin", "canary"])
    sh(work, ["git", "branch", "main"])

    const first = runHook(work)
    expect(first.code).toBe(0)
    expect(first.stderr).toContain("seeding main on origin")
    expect(sh(work, ["git", "ls-remote", "--heads", "origin", "main"])).toContain("refs/heads/main")
    expect(sh(work, ["git", "config", "--local", "--get", markerKey("main", "origin")])).toBe(
      "true",
    )

    const second = runHook(work)
    expect(second.code).toBe(0)
    expect(second.stderr).toBe("")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("leaves a non-GitHub remote alone", () => {
  const root = mkdtempSync(join(tmpdir(), "zerostarter-seed-"))
  try {
    const work = join(root, "work")
    sh(root, ["git", "init", "-q", "-b", "canary", work])
    sh(work, ["git", "remote", "add", "origin", "https://gitlab.com/acme/widgets.git"])
    const run = runHook(work)
    expect(run.code).toBe(0)
    expect(run.stderr).toBe("")
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
