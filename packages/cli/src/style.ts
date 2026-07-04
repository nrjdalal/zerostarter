// TTY-aware SGR coloring (a no-op when the stream is piped, so logs stay free of escape codes) plus the clack-style flow glyphs. Shared by the spawn layer (the rolling window) and the command/prompt layer so both draw the same gutter.

// Left margin on every gutter line.
export const PAD = "  "

const paint =
  (open: string, close: string, stream: { isTTY?: boolean } = process.stdout) =>
  (s: string): string =>
    stream.isTTY ? `\x1b[${open}m${s}\x1b[${close}m` : s

// Match @clack/prompts' palette exactly (it uses picocolors): standard ANSI colors, so they adapt to the terminal theme. cyan is the active step and links; green is success and the selected radio; yellow is warnings; gray is the gutter; dim is subdued detail; red is cancel (stderr-guarded, since it's the only color written to console.error). orange has no ANSI/clack equivalent, so it stays a 256-color for copy-paste commands.
export const cyan = paint("36", "39")
export const green = paint("32", "39")
export const yellow = paint("33", "39")
export const gray = paint("90", "39")
export const dim = paint("2", "22")
export const red = paint("31", "39", process.stderr)
export const orange = paint("38;5;208", "39")

// Spinner pulse: blink from the hollow glyph (◇) to the filled one (◆) while work runs, so a step starts unfilled and fills in as it settles to the completed ◆.
export const PULSE = ["◇", "◆"] as const

// The active (in-progress) line for a pulse frame: only the glyph blinks, hollow (◇) → filled (◆), always cyan (never dimmed). The label stays constant (never dimmed, never blinks).
export const pulseLabel = (frame: number, label: string): string => {
  const i = ((frame % PULSE.length) + PULSE.length) % PULSE.length
  return `${cyan(PULSE[i])}  ${label}`
}

// clack flow glyphs: the gutter (┌ │ └), a submitted step (◇), the active step (◆), radio bullets, and the note box border.
export const S = {
  barStart: "┌",
  bar: "│",
  barEnd: "└",
  active: "◆",
  submit: "◇",
  radioOn: "●",
  radioOff: "○",
  warn: "▲",
  error: "■",
  barH: "─",
  cornerTR: "╮",
  connectL: "├",
  cornerBL: "╰",
  cornerBR: "╯",
} as const
