import { spawnSync } from "@/vendor/cross-spawn"

// Windows-safe process spawning. The vendored cross-spawn resolves PATHEXT and wraps `.cmd`/`.ps1` shims (e.g. a package-manager-installed `bunx`) in `cmd.exe`, which raw `child_process` cannot do on Windows: bare `spawn("bunx", ...)` there can throw ENOENT/EINVAL. Vendored (not a dependency) so nothing lands in the workspace catalog. Every subprocess (bun, bunx, git, docker, the bun installer) goes through here.

// Capture a command's output; throws on a non-zero exit (like the old execFileSync), attaching stdout/stderr to the error so callers can read them. stdin is ignored so a subprocess never blocks waiting on it.
export const run = (cmd: string, args: string[], cwd?: string): string => {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1 << 26,
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (r.error) throw r.error
  if (r.status !== 0) {
    throw Object.assign(new Error(`${cmd} ${args.join(" ")} exited with code ${r.status}`), {
      status: r.status,
      stdout: r.stdout,
      stderr: r.stderr,
    })
  }
  return r.stdout || ""
}

// Run with inherited stdio so the child's own progress streams live (bun install, migrations, the bun installer). Throws on a non-zero exit.
export const runLive = (cmd: string, args: string[], cwd?: string): void => {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" })
  if (r.error) throw r.error
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} exited with code ${r.status}`)
}

// True when the command runs and exits 0; silent. Probes bun / docker without throwing.
export const ok = (cmd: string, args: string[]): boolean => {
  const r = spawnSync(cmd, args, { stdio: "ignore" })
  return !r.error && r.status === 0
}
