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
  if (bytes === 0) return "-"
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

// Build graph with sizes in node labels: opt-in via --graph so the svg stops
// regenerating (and churning diffs) on every commit; run manually to refresh it
if (!process.argv.includes("--graph")) process.exit(0)

const OUTPUT = ".github/assets/graph-build.svg"
const TMP_DOT = ".graph-build.tmp.dot"
const rootName = JSON.parse(await Bun.file("package.json").text()).name

const nodeSizes: Record<string, number> = {
  "@api/hono": bundleSize,
  "@web/next": standaloneSize + staticSize,
  "@packages/auth": await dirSize("packages/auth/dist", "*.d.mts"),
  "@packages/db": await dirSize("packages/db/dist", "*.d.mts"),
  "@packages/env": await dirSize("packages/env/dist", "*.d.mts"),
  "@packages/config": 0,
}

// turbo 2.x renders --graph=*.svg with its own renderer, so emit DOT and render via
// viz.js (graphviz compiled to wasm, same engine turbo's --graph=*.html embeds);
// imported lazily so runs without --graph never load the wasm
const { instance } = await import("@viz-js/viz")
let dotSrc = ""
try {
  // exclude the CLI workspace (packages/cli) from the product graph; it is absent in forks, so this no-ops there
  const cliFilter = (await Bun.file("packages/cli/package.json").exists())
    ? ["--filter=!./packages/cli"]
    : []
  await $`bunx turbo run build --graph=${TMP_DOT} ${cliFilter}`.quiet()
  dotSrc = await Bun.file(TMP_DOT).text()
} finally {
  await Bun.file(TMP_DOT)
    .delete()
    .catch(() => {})
}

// label nodes before rendering so graphviz sizes shapes to fit
const labels = Object.entries(nodeSizes).map(
  ([pkg, size]) =>
    `\t"[root] ${pkg}#build" [label="${size ? `${pkg} (${formatSize(size)})` : pkg}"]`,
)
labels.push(`\t"[root] ___ROOT___" [label="${rootName}"]`)
const viz = await instance()
const rendered = viz.renderString(dotSrc.replace(/}\s*$/, `${labels.join("\n")}\n}`), {
  format: "svg",
})

const svg = rendered
  .replaceAll("[root] ", "")
  .replaceAll("#build", "")
  .replaceAll("___ROOT___", rootName)
  .replaceAll('fill="white"', 'fill="none"')
  .replaceAll('fill="#ffffff"', 'fill="none"')
  .replaceAll('fill="#fff"', 'fill="none"')
  .replaceAll('fill="black"', 'fill="#3b82f6"')
  .replace(/stroke="[^"]*"/g, 'stroke="#3b82f6"')
  .replace(/stroke:[^;]*;/g, "stroke:#3b82f6;")
  .replace(/<text([^>]*)>/g, '<text$1 fill="#3b82f6">')
  .replaceAll('stroke="#3b82f6" points="-4,4', 'stroke="none" points="-4,4')

await Bun.write(OUTPUT, svg)
console.log(`graph-build: wrote ${OUTPUT} (${(svg.length / 1024).toFixed(1)} kB)`)
