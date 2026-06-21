import { createInterface } from "node:readline/promises"

export const isInteractive = (): boolean => Boolean(process.stdin.isTTY && process.stdout.isTTY)

// Render a clickable terminal hyperlink (OSC 8) when stdout is a TTY; falls back to the raw URL when piped.
export const hyperlink = (url: string, text = url): string =>
  process.stdout.isTTY ? `\x1b]8;;${url}\x07${text}\x1b]8;;\x07` : url

// Paint text with an SGR color when the target stream is a TTY (stdout by default); a no-op when piped, so piped output stays free of escape codes.
const paint =
  (code: string, stream: { isTTY?: boolean } = process.stdout) =>
  (s: string): string =>
    stream.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s

// orange marks copy-paste commands and links; green/yellow/red are the status palette (GitHub dark success/attention/danger).
export const orange = paint("38;5;208")
export const green = paint("38;2;63;185;80")
export const yellow = paint("38;2;210;153;34")
// red is the only color written to stderr (console.error), so guard it on stderr, not stdout.
export const red = paint("38;2;248;81;73", process.stderr)

export const promptText = async (question: string, def = ""): Promise<string> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question(`${question}${def ? ` (${def})` : ""}: `)).trim()
    return answer || def
  } finally {
    rl.close()
  }
}

export const promptConfirm = async (question: string, def = true): Promise<boolean> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question(`${question} (${def ? "Y/n" : "y/N"}) `)).trim().toLowerCase()
    if (!answer) return def
    return answer === "y" || answer === "yes"
  } finally {
    rl.close()
  }
}
