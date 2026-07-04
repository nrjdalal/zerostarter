import { cyan, dim, gray, PAD as P, PULSE, S } from "@/style"
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

// Run a command as a clack-style step: a `label` that pulses between the filled ◆ and hollow ◇ while it runs, with a dimmed rolling window of its last `lines` output lines beneath it, collapsing on success to a completed `◆ summarize(output, durationMs)`. On failure the captured output is dumped so the error stays visible, then it rejects. Off a TTY (CI, piped) it prints the label and streams the command in full so logs are complete.
export const runTail = async (
  cmd: string,
  args: string[],
  opts: {
    cwd?: string
    lines?: number
    label?: string
    summarize: (output: string, durationMs: number) => string
  },
): Promise<void> => {
  const start = Date.now()
  const out = process.stdout
  const label = opts.label ?? ""
  if (!out.isTTY) {
    if (label) out.write(`${P}${cyan(S.active)}  ${label}\n`)
    await runLive(cmd, args, opts.cwd)
    return
  }
  const max = opts.lines ?? 3
  const window: string[] = []
  let frame = 0
  let rendered = 0
  let pending = ""
  let output = ""
  const width = (): number => (out.columns || 80) - 1
  // Toggle the terminal's auto-wrap. It stays off while the block renders: a wide char or long line would otherwise wrap to a second row, making the cursor-up count short so the window grows past `max` lines.
  const setWrap = (on: boolean): void => {
    out.write(on ? `${ESC}[?7h` : `${ESC}[?7l`)
  }
  const erase = (): void => {
    if (rendered > 0) {
      out.write(`${ESC}[${rendered}A${ESC}[0J`)
      rendered = 0
    }
  }
  // Redraw the whole active block (pulsing label + rolling window) from its top; called on each new output line and on every pulse tick.
  const render = (): void => {
    erase()
    let n = 0
    out.write(`${P}${cyan(PULSE[frame])}  ${label}\n`)
    n++
    if (window.length) {
      out.write(`${P}${gray(S.bar)}\n`)
      n++
      for (const line of window.slice(-max)) {
        out.write(`${P}${gray(S.bar)}  ${dim(line.slice(0, Math.max(0, width() - 5)))}\n`)
        n++
      }
    }
    rendered = n
  }
  const onData = (chunk: string): void => {
    output += chunk
    pending += chunk
    const parts = pending.split("\n")
    pending = parts.pop() ?? ""
    for (const raw of parts) {
      window.push(stripAnsi(raw).replace(/\r/g, "").replace(/\t/g, " ").trimEnd())
      render()
    }
  }
  render()
  setWrap(false)
  // Ctrl-C terminates via signal, not a throw, so neither restore path below runs; re-enable auto-wrap here or the shell is left with it off.
  const onSigint = (): void => {
    setWrap(true)
    process.exit(130)
  }
  process.once("SIGINT", onSigint)
  const pulse = setInterval(() => {
    frame = (frame + 1) % PULSE.length
    render()
  }, 400)
  const stop = (): void => {
    clearInterval(pulse)
    process.removeListener("SIGINT", onSigint)
  }
  try {
    await nanoSpawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] }, onData)
  } catch (err) {
    stop()
    erase()
    setWrap(true)
    out.write(output)
    throw err
  }
  stop()
  erase()
  setWrap(true)
  const summary = opts.summarize(output, Date.now() - start).trim()
  out.write(`${P}${cyan(S.active)}  ${summary || label}\n`)
}
