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

const ESC = "\x1b"
// Strip all CSI escape sequences (color, cursor moves, line erases) so a streamed line renders as plain text in the window without glitching the cursor math.
const csi = new RegExp(`${ESC}\\[[0-9;?]*[a-zA-Z]`, "g")
const stripAnsi = (s: string): string => s.replace(csi, "")

// Format an elapsed duration like bun's install summary: [2.77s] for >= 1s, [978.00ms] otherwise.
export const formatDuration = (ms: number): string =>
  ms >= 1000 ? `[${(ms / 1000).toFixed(2)}s]` : `[${ms.toFixed(2)}ms]`

// Run a command showing only a rolling window of its last `lines` output lines (dimmed, in place) on a TTY, then erase the window and print a blank line + summarize(output, durationMs) so the summary sits framed where the window was. On failure the captured output is dumped so the error stays visible, then it rejects. Off a TTY (CI, piped) it streams in full so logs are complete.
export const runTail = async (
  cmd: string,
  args: string[],
  opts: { cwd?: string; lines?: number; summarize: (output: string, durationMs: number) => string },
): Promise<void> => {
  const start = Date.now()
  if (!process.stdout.isTTY) {
    await runLive(cmd, args, opts.cwd)
    return
  }
  const max = opts.lines ?? 3
  const window: string[] = []
  let rendered = 0
  let pending = ""
  let output = ""
  const width = (): number => (process.stdout.columns || 80) - 1
  // Toggle the terminal's auto-wrap. It stays off while the window renders: a wide char (emoji, spinner) or long line would otherwise wrap to a second row, making the cursor-up count short so the window grows past `max` lines.
  const setWrap = (on: boolean): void => {
    process.stdout.write(on ? `${ESC}[?7h` : `${ESC}[?7l`)
  }
  const erase = (): void => {
    if (rendered > 0) {
      process.stdout.write(`${ESC}[${rendered}A${ESC}[0J`)
      rendered = 0
    }
  }
  const draw = (): void => {
    erase()
    const shown = window.slice(-max)
    for (const line of shown) process.stdout.write(`${ESC}[2m${line.slice(0, width())}${ESC}[0m\n`)
    rendered = shown.length
  }
  const onData = (chunk: string): void => {
    output += chunk
    pending += chunk
    const parts = pending.split("\n")
    pending = parts.pop() ?? ""
    for (const raw of parts) {
      window.push(stripAnsi(raw).replace(/\r/g, "").replace(/\t/g, " ").trimEnd())
      draw()
    }
  }
  setWrap(false)
  try {
    await nanoSpawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] }, onData)
  } catch (err) {
    erase()
    setWrap(true)
    process.stdout.write(output)
    throw err
  }
  erase()
  setWrap(true)
  const summary = opts.summarize(output, Date.now() - start).trim()
  if (summary) {
    console.log()
    console.log(summary)
  }
}
