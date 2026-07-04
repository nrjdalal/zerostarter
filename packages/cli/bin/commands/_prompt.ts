import { createInterface } from "node:readline/promises"

import { cyan, dim, gray, green, PAD as P, pulseLabel, red, S, yellow } from "@/style"

export { cyan, dim, gray, green, orange, PAD, red, yellow } from "@/style"

export const isInteractive = (): boolean => Boolean(process.stdin.isTTY && process.stdout.isTTY)

// Render a clickable terminal hyperlink (OSC 8) when stdout is a TTY; falls back to the raw URL when piped.
export const hyperlink = (url: string, text = url): string =>
  process.stdout.isTTY ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07` : url

// A clickable, cyan URL: OSC 8 wraps the colored text (link outermost) and the URL is the visible text, so terminals that auto-detect bare URLs also linkify it.
export const link = (url: string): string => hyperlink(url, cyan(url))

// clack support functions: an indented gutter (PAD) capped by ┌ / └. Steps and notes stack tightly (no blank │ between them); only the intro and outro get a │ connector, so the first and last lines are spaced from the rest.
export const intro = (title: string): void => {
  process.stdout.write(`\n${P}${gray(S.barStart)}  ${title}\n${P}${gray(S.bar)}\n`)
}

export const outro = (message: string): void => {
  process.stdout.write(`${P}${gray(S.bar)}\n${P}${gray(S.barEnd)}  ${message}\n`)
}

// Close the flow as cancelled (red end); used on Ctrl-C or a declined prompt.
export const cancel = (message = "Cancelled"): void => {
  process.stdout.write(`${P}${gray(S.barEnd)}  ${red(message)}\n`)
}

const ESC = "\x1b"
const noteVisibleLen = (s: string): number =>
  s
    .replace(new RegExp(`${ESC}\\[[0-9;?]*[a-zA-Z]`, "g"), "")
    .replace(new RegExp(`${ESC}\\]8;;.*?\\x07`, "g"), "").length

// clack note: a box hanging off the gutter with a titled top border and the message lines inside, sitting tight against the surrounding steps. When `last`, the gutter closes with a rounded corner (╰) instead of the ├ tee that continues it.
export const note = (message: string, title = "", last = false): void => {
  const lines = `\n${message}\n`.split("\n")
  const titleLen = noteVisibleLen(title)
  const content = lines.reduce((m, ln) => Math.max(m, noteVisibleLen(ln)), titleLen)
  // Floor the box at 60 columns wide (├…╯) so short notes aren't cramped; grow past that for longer content.
  const len = Math.max(content, 54) + 2
  const body = lines
    .map((ln) => `${P}${gray(S.bar)}  ${ln}${" ".repeat(len - noteVisibleLen(ln))}${gray(S.bar)}`)
    .join("\n")
  const bottomLeft = last ? S.cornerBL : S.connectL
  process.stdout.write(
    `${P}${cyan(S.active)}  ${title} ${gray(S.barH.repeat(Math.max(len - titleLen - 1, 1)) + S.cornerTR)}\n${body}\n${P}${gray(bottomLeft + S.barH.repeat(len + 2) + S.cornerBR)}\n`,
  )
}

// A completed step (cyan ◆); `detail` lines sit under it.
export const logStep = (message: string, detail: string[] = []): void => {
  process.stdout.write(`${P}${cyan(S.active)}  ${message}\n`)
  for (const line of detail) process.stdout.write(`${P}${gray(S.bar)}  ${line}\n`)
}

// A success line (green ◆ and green message) for a completed milestone.
export const logSuccess = (message: string): void => {
  process.stdout.write(`${P}${green(S.active)}  ${green(message)}\n`)
}

// An informational line (cyan ◆) in the flow.
export const logInfo = (message: string): void => {
  process.stdout.write(`${P}${cyan(S.active)}  ${message}\n`)
}

// A warning (yellow ▲) with optional detail lines.
export const logWarn = (message: string, detail: string[] = []): void => {
  process.stdout.write(`${P}${yellow(S.warn)}  ${yellow(message)}\n`)
  for (const line of detail) process.stdout.write(`${P}${gray(S.bar)}  ${yellow(line)}\n`)
}

// A spinner whose glyph blinks hollow ◇ → filled ◆ (always cyan, never dimmed; the label stays constant) while `fn` runs, collapsing to a completed step (◆). Used for work with no streamable output (fetch, rebrand). Off a TTY it just prints the completed step.
export const withSpinner = async <T>(
  active: string,
  done: string,
  fn: () => T | Promise<T>,
): Promise<T> => {
  const out = process.stdout
  let timer: ReturnType<typeof setInterval> | null = null
  if (out.isTTY) {
    let i = 0
    out.write(`${P}${pulseLabel(0, active)}`)
    timer = setInterval(() => {
      i = i + 1
      out.write(`\r\x1b[K${P}${pulseLabel(i, active)}`)
    }, 400)
  }
  try {
    const result = await fn()
    if (timer) clearInterval(timer)
    out.write(
      out.isTTY ? `\r\x1b[K${P}${cyan(S.active)}  ${done}\n` : `${P}${cyan(S.active)}  ${done}\n`,
    )
    return result
  } catch (err) {
    if (timer) clearInterval(timer)
    if (out.isTTY) out.write(`\r\x1b[K`)
    throw err
  }
}

// The selected option gets a green ● bullet with a bright label; the other is dimmed.
const renderOptions = (value: boolean): string => {
  const yes = value ? `${green(S.radioOn)} Yes` : dim(`${S.radioOff} Yes`)
  const no = value ? dim(`${S.radioOff} No`) : `${green(S.radioOn)} No`
  return `${P}${gray(S.bar)}  ${yes} ${dim("/")} ${no}`
}

// clack-style confirm: `◆ message` + `● Yes / ○ No`, toggled with arrows or y/n. On submit the prompt clears itself (transient: the following step speaks for the choice, so no `◆ message Yes` echo lingers). Off a TTY it takes the default without prompting, echoing the auto-choice so non-interactive logs record it.
export const promptConfirm = async (question: string, def = true): Promise<boolean> => {
  const out = process.stdout
  if (!isInteractive()) {
    out.write(`${P}${cyan(S.active)}  ${question} ${dim(def ? "Yes" : "No")}\n`)
    return def
  }
  return new Promise<boolean>((resolve) => {
    let value = def
    const stdin = process.stdin
    // rows the "◆  <question>" line occupies once it wraps at the terminal width (PAD + ◆ + two spaces = 5), so the collapse clears all of them, not just one
    const qRows = Math.max(1, Math.ceil((5 + noteVisibleLen(question)) / (out.columns || 80)))
    out.write(`${P}${cyan(S.submit)}  ${question}\n`)
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
      resolve(value)
    }
    function onData(key: string): void {
      if (key === "\x03") {
        cleanup()
        clearPrompt()
        out.write(`${P}${cyan(S.submit)}  ${dim(question)}\n`)
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
  process.stdout.write(`${P}${cyan(S.submit)}  ${question}${def ? ` ${dim(`(${def})`)}` : ""}\n`)
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question(`${P}${gray(S.bar)}  `)).trim()
    return answer || def
  } finally {
    rl.close()
  }
}
