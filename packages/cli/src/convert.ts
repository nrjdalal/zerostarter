import { join } from "node:path"

import { exists, read, readJson, remove, replaceInFile, write, writeJson } from "@/io"
import {
  agentsTemplate,
  blogIndexTemplate,
  type Brand,
  consoleIndexTemplate,
  docsConfigTemplate,
  docsIndexTemplate,
  homeTemplate,
  sampleBlogPostTemplate,
  siteTemplate,
} from "@/templates"

const p = (root: string, ...parts: string[]): string => join(root, ...parts)

// npm-safe package name derived from the project name.
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "app"

// Everything a fork excludes lives in one source: the repo-root .gitpickignore.
// gitpick (>=5.5.0) skips those paths on fetch and never copies the ignore file, so a
// gitpick-fetched fork already lacks them. This mirrors that for an in-place conversion of a
// full clone (where nothing was excluded), then removes the ignore file so the fork never ships it.
const removeForkExcludes = (root: string): void => {
  const ignore = p(root, ".gitpickignore")
  if (!exists(ignore)) return
  for (const line of read(ignore).split("\n")) {
    const path = line.trim()
    if (path && !path.startsWith("#")) remove(p(root, path))
  }
  remove(ignore)
}

// The two font exports whose woff2 files are removed above (only the deleted routes used them).
const CAVEAT_EXPORT = `
export const caveat = localFont({
  src: "../fonts/marketing/caveat-latin-wght-normal.woff2",
  variable: "--font-caveat",
  weight: "400 700",
})
`
const NEWSREADER_EXPORT = `
export const newsreader = localFont({
  src: [
    { path: "../fonts/marketing/newsreader-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/marketing/newsreader-latin-wght-italic.woff2", style: "italic" },
  ],
  variable: "--font-newsreader",
  weight: "200 800",
})
`

// Write the generic stubs so the app builds clean and reads as a fresh product.
const scaffoldContent = (root: string): void => {
  // Stamp the earlier of the local and UTC date: its UTC midnight is always <= now (never hidden), and it matches the author's own calendar day when their timezone is behind UTC.
  const now = new Date()
  const utc = now.toISOString().slice(0, 10)
  const local = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("-")
  const today = local < utc ? local : utc
  write(p(root, "web/next/content/docs/index.mdx"), docsIndexTemplate())
  write(p(root, "web/next/content/blog/index.mdx"), blogIndexTemplate(today))
  write(p(root, "web/next/content/blog/hello-world.mdx"), sampleBlogPostTemplate(today))
  write(p(root, "web/next/content/console/docs/index.mdx"), consoleIndexTemplate())
  write(p(root, "web/next/docs.config.ts"), docsConfigTemplate())
  write(p(root, "web/next/public/.gitkeep"), "")
  write(p(root, "web/next/src/app/page.tsx"), homeTemplate())
  write(p(root, "AGENTS.md"), agentsTemplate())
}

// Clean up the references the route and font deletes leave dangling; fail loudly on drift.
const fixDangling = (root: string): void => {
  const navOk = replaceInFile(p(root, "web/next/src/components/navbar/home.tsx"), [
    ['    { href: "/hire", label: "Hire" },\n', ""],
  ])
  const caveatOk = replaceInFile(p(root, "web/next/src/lib/fonts.ts"), [[CAVEAT_EXPORT, ""]])
  const newsreaderOk = replaceInFile(p(root, "web/next/src/lib/fonts.ts"), [
    [NEWSREADER_EXPORT, ""],
  ])
  if (!caveatOk || !newsreaderOk) {
    throw new Error(
      "fonts.ts: caveat/newsreader exports not found, but their woff2 files were removed (template drift). Update packages/cli/src/convert.ts.",
    )
  }
  if (!navOk) {
    throw new Error(
      "navbar/home.tsx: /hire entry not found (template drift). Update packages/cli/src/convert.ts.",
    )
  }
}

// Regenerate the centralized brand file and rename the root package.
const rebrand = (root: string, b: Brand): void => {
  write(p(root, "packages/config/src/site.ts"), siteTemplate(b))
  const path = p(root, "package.json")
  const pkg = readJson<Record<string, unknown>>(path)
  pkg.name = slugify(b.name)
  pkg.version = "0.0.0"
  delete pkg.homepage
  delete pkg.bugs
  delete pkg.license
  delete pkg.author
  delete pkg.repository
  delete pkg.funding
  writeJson(path, pkg)
}

export const convertRepo = (root: string, brand: Brand): void => {
  removeForkExcludes(root)
  scaffoldContent(root)
  fixDangling(root)
  rebrand(root, brand)
}
