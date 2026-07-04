import { createInterface } from "node:readline/promises"

import { cyan, dim, gray, green, red, S, yellow } from "@/style"

export { cyan, dim, gray, green, orange, red, yellow } from "@/style"

export const isInteractive = (): boolean => Boolean(process.stdin.isTTY && process.stdout.isTTY)

// Render a clickable terminal hyperlink (OSC 8) when stdout is a TTY; falls back to the raw URL when piped.
export const hyperlink = (url: string, text = url): string =>
  process.stdout.isTTY ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07` : url

// clack support functions: a connected gutter where each turn is `│` then a symbol line.
export const intro = (title: string): void => {
  process.stdout.write(`\n${gray(S.barStart)}  ${title}\n`)
}

export const outro = (message: string): void => {
  process.stdout.write(`${gray(S.bar)}\n${gray(S.barEnd)}  ${message}\n`)
}

// Close the flow as cancelled (red end); used on Ctrl-C or a declined prompt.
export const cancel = (message = "Cancelled"): void => {
  process.stdout.write(`${gray(S.bar)}\n${gray(S.barEnd)}  ${red(message)}\n`)
}

const ESC = "\x1b"
const noteVisibleLen = (s: string): number =>
  s
    .replace(new RegExp(`${ESC}\\[[0-9;?]*[a-zA-Z]`, "g"), "")
    .replace(new RegExp(`${ESC}\\]8;;.*?\\x07`, "g"), "").length

// clack note: a box hanging off the gutter with a titled top border and the message lines inside. When `last`, the gutter closes with a rounded corner (╰) instead of the ├ tee that continues it.
export const note = (message: string, title = "", last = false): void => {
  const lines = `\n${message}\n`.split("\n")
  const titleLen = noteVisibleLen(title)
  const len =
    Math.max(
      lines.reduce((m, ln) => Math.max(m, noteVisibleLen(ln)), titleLen),
      titleLen,
    ) + 2
  const body = lines
    .map((ln) => `${gray(S.bar)}  ${ln}${" ".repeat(len - noteVisibleLen(ln))}${gray(S.bar)}`)
    .join("\n")
  const bottomLeft = last ? S.cornerBL : S.connectL
  process.stdout.write(
    `${gray(S.bar)}\n${cyan(S.submit)}  ${title} ${gray(S.barH.repeat(Math.max(len - titleLen - 1, 1)) + S.cornerTR)}\n${body}\n${gray(bottomLeft + S.barH.repeat(len + 2) + S.cornerBR)}\n`,
  )
}

// A completed step (green ◇), preceded by a gutter connector; `detail` lines sit under the bar.
export const logStep = (message: string, detail: string[] = []): void => {
  process.stdout.write(`${gray(S.bar)}\n${cyan(S.submit)}  ${message}\n`)
  for (const line of detail) process.stdout.write(`${gray(S.bar)}  ${line}\n`)
}

// A success line (green ◇ and green message) for a completed milestone.
export const logSuccess = (message: string): void => {
  process.stdout.write(`${gray(S.bar)}\n${green(S.submit)}  ${green(message)}\n`)
}

// An informational line (cyan ◆) in the flow.
export const logInfo = (message: string): void => {
  process.stdout.write(`${gray(S.bar)}\n${cyan(S.active)}  ${message}\n`)
}

// A warning (yellow ▲) with optional detail lines.
export const logWarn = (message: string, detail: string[] = []): void => {
  process.stdout.write(`${gray(S.bar)}\n${yellow(S.warn)}  ${yellow(message)}\n`)
  for (const line of detail) process.stdout.write(`${gray(S.bar)}  ${yellow(line)}\n`)
}

// The selected option gets a green ● bullet with a bright label; the other is dimmed.
const renderOptions = (value: boolean): string => {
  const yes = value ? `${green(S.radioOn)} Yes` : dim(`${S.radioOff} Yes`)
  const no = value ? dim(`${S.radioOff} No`) : `${green(S.radioOn)} No`
  return `${gray(S.bar)}  ${yes} ${dim("/")} ${no}`
}

// clack-style confirm: `◆ message` + `● Yes / ○ No`, toggled with arrows or y/n. Normally collapses to `◇ message Yes`; when `erase` is set it removes itself entirely on submit so the step that follows (e.g. the provisioning tail) takes its place. Falls back to the default without prompting when not interactive.
export const promptConfirm = async (
  question: string,
  def = true,
  erase = false,
): Promise<boolean> => {
  const out = process.stdout
  if (!isInteractive()) {
    if (!erase)
      out.write(`${gray(S.bar)}\n${cyan(S.submit)}  ${question} ${dim(def ? "Yes" : "No")}\n`)
    return def
  }
  return new Promise<boolean>((resolve) => {
    let value = def
    const stdin = process.stdin
    // rows the "◆  <question>" line occupies once it wraps at the terminal width, so the collapse clears all of them, not just one
    const qRows = Math.max(1, Math.ceil((3 + noteVisibleLen(question)) / (out.columns || 80)))
    out.write(`${gray(S.bar)}\n${cyan(S.active)}  ${question}\n`)
    out.write(renderOptions(value))
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding("utf8")
    const cleanup = (): void => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.removeListener("data", onData)
    }
    // clear the options line, then the (possibly wrapped) question line and everything below
    const clearPrompt = (): void => {
      out.write(`\r\x1b[K\x1b[${qRows}A\r\x1b[0J`)
    }
    const submit = (): void => {
      cleanup()
      clearPrompt()
      if (erase) {
        // drop the gutter connector too, leaving the cursor where the prompt began so the next step reuses it
        out.write(`\x1b[1A\r\x1b[K`)
      } else {
        out.write(`${cyan(S.submit)}  ${question} ${dim(value ? "Yes" : "No")}\n`)
      }
      resolve(value)
    }
    function onData(key: string): void {
      if (key === "\x03") {
        cleanup()
        clearPrompt()
        out.write(`${dim(S.submit)}  ${dim(question)}\n`)
        cancel()
        process.exit(130)
      } else if (key === "\r" || key === "\n") {
        submit()
      } else if (key === "y" || key === "Y") {
        value = true
        submit()
      } else if (key === "n" || key === "N") {
        value = false
        submit()
      } else if (
        key === "\x1b[C" ||
        key === "\x1b[D" ||
        key === "\x1b[A" ||
        key === "\x1b[B" ||
        key === "h" ||
        key === "l"
      ) {
        value = !value
        out.write(`\r\x1b[K${renderOptions(value)}`)
      }
    }
    stdin.on("data", onData)
  })
}

// A single-line text prompt in the gutter; the entered value stays under the bar.
export const promptText = async (question: string, def = ""): Promise<string> => {
  process.stdout.write(
    `${gray(S.bar)}\n${cyan(S.active)}  ${question}${def ? ` ${dim(`(${def})`)}` : ""}\n`,
  )
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question(`${gray(S.bar)}  `)).trim()
    return answer || def
  } finally {
    rl.close()
  }
}
