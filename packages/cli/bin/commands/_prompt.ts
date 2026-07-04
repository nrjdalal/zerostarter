import { createInterface } from "node:readline/promises"

import { cyan, dim, gray, green, S, yellow } from "@/style"

export { cyan, dim, gray, green, orange, red, yellow } from "@/style"

export const isInteractive = (): boolean => Boolean(process.stdin.isTTY && process.stdout.isTTY)

// Render a clickable terminal hyperlink (OSC 8) when stdout is a TTY; falls back to the raw URL when piped.
export const hyperlink = (url: string, text = url): string =>
  process.stdout.isTTY ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07` : url

// clack support functions: a connected gutter where each turn is `│` then a symbol line.
export const intro = (title: string): void => {
  process.stdout.write(`${gray(S.barStart)}  ${title}\n`)
}

export const outro = (message: string): void => {
  process.stdout.write(`${gray(S.bar)}\n${gray(S.barEnd)}  ${message}\n`)
}

// A completed step (green ◇), preceded by a gutter connector; `detail` lines sit under the bar.
export const logStep = (message: string, detail: string[] = []): void => {
  process.stdout.write(`${gray(S.bar)}\n${green(S.submit)}  ${message}\n`)
  for (const line of detail) process.stdout.write(`${gray(S.bar)}  ${line}\n`)
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

const renderOptions = (value: boolean): string => {
  const yes = value ? cyan(`${S.radioOn} Yes`) : dim(`${S.radioOff} Yes`)
  const no = value ? dim(`${S.radioOff} No`) : cyan(`${S.radioOn} No`)
  return `${gray(S.bar)}  ${yes} ${dim("/")} ${no}`
}

// clack-style confirm: `◆ message` + `● Yes / ○ No`, toggled with arrows or y/n, collapsing to `◇ message` + `│ Yes`. Falls back to the default without prompting when not interactive.
export const promptConfirm = async (question: string, def = true): Promise<boolean> => {
  const out = process.stdout
  if (!isInteractive()) {
    out.write(
      `${gray(S.bar)}\n${green(S.submit)}  ${question}\n${gray(S.bar)}  ${def ? "Yes" : "No"}\n`,
    )
    return def
  }
  return new Promise<boolean>((resolve) => {
    let value = def
    const stdin = process.stdin
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
    const submit = (): void => {
      cleanup()
      out.write(`\r\x1b[K`)
      out.write(`\x1b[1A\r\x1b[K`)
      out.write(`${green(S.submit)}  ${question}\n`)
      out.write(`\x1b[K${gray(S.bar)}  ${value ? "Yes" : "No"}\n`)
      resolve(value)
    }
    function onData(key: string): void {
      if (key === "\x03") {
        cleanup()
        out.write("\n")
        process.exit(1)
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
