import { $, Glob } from "bun"

async function dirSize(path: string, exclude?: string): Promise<number> {
  try {
    if (exclude) {
      const glob = new Glob(`**/*`)
      const excludeGlob = new Glob(exclude)
      let total = 0
      for await (const entry of glob.scan({ cwd: path, dot: true })) {
        if (excludeGlob.match(entry)) continue
        const stat = Bun.file(`${path}/${entry}`)
        total += stat.size
      }
      return total
    }
    const result = await $`du -sk ${path}`.quiet()
    return parseInt(result.text().split("\t")[0]) * 1024
  } catch {
    return 0
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const distSize = await dirSize("api/hono/dist", "*.d.mts")
const bundleSize = await dirSize("api/hono/bundle")
const standaloneSize = await dirSize("web/next/.next/standalone")
const staticSize = await dirSize("web/next/.next/static")

const rows = [
  ["@api/hono", "dist", formatSize(distSize)],
  ["", "bundle *", formatSize(bundleSize)],
  ["@web/next", "standalone", formatSize(standaloneSize)],
  ["", "static", formatSize(staticSize)],
  ["", "standalone + static *", formatSize(standaloneSize + staticSize)],
]

const widths = [0, 0, 0]
for (const row of rows) {
  for (let i = 0; i < row.length; i++) {
    widths[i] = Math.max(widths[i], row[i].length)
  }
}

const line = (l: string, m: string, r: string) =>
  `${l}${"─".repeat(widths[0] + 2)}${m}${"─".repeat(widths[1] + 2)}${m}${"─".repeat(widths[2] + 2)}${r}`

const fmtRow = (row: string[]) =>
  `│ ${row[0].padEnd(widths[0])} │ ${row[1].padEnd(widths[1])} │ ${row[2].padStart(widths[2])} │`

console.log(line("┌", "┬", "┐"))
console.log(
  `│ ${"App".padEnd(widths[0])} │ ${"Serve".padEnd(widths[1])} │ ${"Size".padStart(widths[2])} │`,
)
console.log(line("├", "┼", "┤"))
console.log(fmtRow(rows[0]))
console.log(fmtRow(rows[1]))
console.log(line("├", "┼", "┤"))
for (let i = 2; i < rows.length; i++) {
  console.log(fmtRow(rows[i]))
}
console.log(line("└", "┴", "┘"))
