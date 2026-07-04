// TTY-aware SGR coloring (a no-op when the stream is piped, so logs stay free of escape codes) plus the clack-style flow glyphs. Shared by the spawn layer (the rolling window) and the command/prompt layer so both draw the same gutter.

const paint =
  (code: string, stream: { isTTY?: boolean } = process.stdout) =>
  (s: string): string =>
    stream.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s

// orange marks copy-paste commands and links; green/yellow are the status palette; cyan is the active step; gray is the gutter; dim is subdued detail.
export const orange = paint("38;5;208")
export const green = paint("38;2;63;185;80")
export const yellow = paint("38;2;210;153;34")
export const cyan = paint("38;2;56;189;248")
export const gray = paint("38;2;110;118;129")
export const dim = paint("2")
// red is the only color written to stderr (console.error), so guard it on stderr.
export const red = paint("38;2;248;81;73", process.stderr)

// clack flow glyphs: the gutter (┌ │ └), a submitted step (◇), the active step (◆), and radio bullets.
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
} as const
