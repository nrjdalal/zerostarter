import { nanoSpawn } from "@/vendor/nano-spawn"

// Async, Windows-safe process spawning on the vendored nano-spawn: non-blocking (the event loop stays free while a subprocess runs), and on Windows it runs `.cmd`/`.ps1` shims (e.g. a package-manager-installed `bunx`) that raw `child_process` cannot. Vendored, not a dependency, so nothing lands in the workspace catalog. Every subprocess (bun, bunx, git, docker, the bun installer) goes through here.

// Capture a command's output; rejects on a non-zero exit with a SubprocessError carrying stdout/stderr. stdin is ignored so a subprocess never blocks waiting on it.
export const run = async (cmd: string, args: string[], cwd?: string): Promise<string> => {
  const { stdout } = await nanoSpawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] })
  return stdout
}

// Run with inherited stdio so the child's own progress streams live (bun install, migrations, the bun installer). Rejects on a non-zero exit.
export const runLive = async (cmd: string, args: string[], cwd?: string): Promise<void> => {
  await nanoSpawn(cmd, args, { cwd, stdio: "inherit" })
}

// Resolves true when the command runs and exits 0; silent, never rejects. Probes bun / docker.
export const ok = async (cmd: string, args: string[]): Promise<boolean> => {
  try {
    await nanoSpawn(cmd, args, { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}
