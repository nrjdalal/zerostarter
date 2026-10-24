import { rm } from "node:fs/promises"
import { join } from "node:path"

// Rescaffolds web/next's shadcn components, then reapplies shadcn-customize.ts and formats. Runs from the repo root (cwd).

// shadcn init and add -a rewrite these paths, and shadcn-customize.ts resets some to HEAD. An uncommitted change here can be lost, so the script stops.
const GUARDED = [
  "web/next/src/components/ui",
  "web/next/components.json",
  "web/next/package.json",
  "bun.lock",
  "package.json",
  "web/next/src/app/layout.tsx",
  "web/next/src/app/globals.css",
  "web/next/src/hooks",
  "web/next/src/lib",
]

const dirty = Bun.spawnSync(["git", "status", "--porcelain", "--", ...GUARDED])
if (dirty.exitCode !== 0) process.exit(dirty.exitCode ?? 1)
if (dirty.stdout.length) {
  console.error(
    "sync:shadcn: these files have uncommitted changes, and the sync can overwrite them. Commit or stash them first:",
  )
  console.error(dirty.stdout.toString().trimEnd())
  process.exit(1)
}

const run = (cmd: string[], cwd = ".") => {
  const { exitCode } = Bun.spawnSync(cmd, { cwd, stdio: ["inherit", "inherit", "inherit"] })
  if (exitCode !== 0) process.exit(exitCode ?? 1)
}

await rm("web/next/components.json", { force: true })
await rm("web/next/src/components/ui", { force: true, recursive: true })
run(
  ["bunx", "shadcn@latest", "init", "--template", "next", "--preset", "a16C8", "--base", "base"],
  "web/next",
)
run(["bunx", "shadcn@latest", "add", "-a"], "web/next")
run(["bun", join(import.meta.dir, "shadcn-customize.ts")])
run(["bun", "run", "format"])
