import { cyan, dim, dimErr, gray, PAD as P, pulseLabel, red, S } from "@/style"
import { nanoSpawn, SubprocessError } from "@/vendor/nano-spawn"

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

// Errors whose captured output runTail already streamed to the terminal in full, so printError shows the message alone rather than repeating the tail.
const dumped = new WeakSet<object>()

// Top-level error renderer: the message in red, plus the tail of a failed subprocess's captured output. A SubprocessError's real cause (a gitpick/git/docker failure) lives on its stdout/stderr, which the bare message omits; runTail-dumped errors skip the tail since their full output already printed.
export const printError = (err: unknown): void => {
  process.stderr.write(`\n${P}${red(err instanceof Error ? err.message : String(err))}\n`)
  if (!(err instanceof SubprocessError) || dumped.has(err)) return
  const output = (err.stderr || err.stdout || "").trim()
  if (!output) return
  const lines = stripAnsi(output)
    .split("\n")
    .map((l) => l.trimEnd())
    .filter(Boolean)
    .slice(-12)
  for (const line of lines) process.stderr.write(`${P}${dimErr(line)}\n`)
}

// Run a command as a clack-style step: a `label` that pulses between the filled ◆ and hollow ◇ while it runs, with a dimmed rolling window of its last `lines` output lines beneath it. On success it collapses to a completed `◆ done` (a past-tense done label, defaulting to `label`) and keeps the tail of the output beneath as a trace. On failure the captured output is dumped so the error stays visible, then it rejects. Off a TTY (CI, piped) it prints the label and streams the command in full so logs are complete.
export const runTail = async (
  cmd: string,
  args: string[],
  opts: {
    cwd?: string
    lines?: number
    label?: string
    done?: string
  },
): Promise<void> => {
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
    out.write(`${P}${pulseLabel(frame, label)}\n`)
    n++
    for (const line of window.slice(-max)) {
      out.write(`${P}${gray(S.bar)}  ${dim(line.slice(0, Math.max(0, width() - 5)))}\n`)
      n++
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
    frame = frame + 1
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
    // Full output already streamed here; mark it so the top-level printError doesn't repeat the tail.
    if (err && typeof err === "object") dumped.add(err)
    throw err
  }
  stop()
  erase()
  setWrap(true)
  out.write(`${P}${cyan(S.active)}  ${opts.done ?? label}\n`)
  // Keep the tail of the output visible under the completed step as a trace, rather than erasing it.
  for (const line of window.slice(-max)) {
    out.write(`${P}${gray(S.bar)}  ${dim(line.slice(0, Math.max(0, width() - 5)))}\n`)
  }
}
