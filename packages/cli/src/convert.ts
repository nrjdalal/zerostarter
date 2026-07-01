import { join } from "node:path"

import { readJson, remove, replaceInFile, write, writeJson } from "@/io"
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

// Directories a fork supplies itself: the author's content and public assets.
// Agent skills (.agents/skills, symlinked from .claude/skills and .github/skills) are KEPT,
// so a scaffolded project ships with the same agent playbook.
const IGNORED_DIRS = ["web/next/content", "web/next/public"]

// Author pages, dev-meta, starter tooling, and resume-only fonts a fork does not ship.
const REMOVE_PATHS = [
  "packages/cli",
  ".github/workflows/cli-release.yml",
  ".github/audit",
  ".infisical.json",
  ".coderabbit.yaml",
  ".github/assets/graph-build.svg",
  ".github/assets/cli.tape",
  ".github/assets/setup.sh",
  ".github/assets/cli.gif",
  ".github/FUNDING.yml",
  "LICENSE.md",
  "CHANGELOG.md",
  "bun.lock",
  "web/next/src/app/hire",
  "web/next/src/app/resume",
  "web/next/src/fonts/caveat-latin-wght-normal.woff2",
  "web/next/src/fonts/newsreader-latin-wght-normal.woff2",
  "web/next/src/fonts/newsreader-latin-wght-italic.woff2",
]

// The two font exports whose woff2 files are removed above (only the deleted routes used them).
const CAVEAT_EXPORT = `
export const caveat = localFont({
  src: "../fonts/caveat-latin-wght-normal.woff2",
  variable: "--font-caveat",
  weight: "400 700",
})
`
const NEWSREADER_EXPORT = `
export const newsreader = localFont({
  src: [
    { path: "../fonts/newsreader-latin-wght-normal.woff2", style: "normal" },
    { path: "../fonts/newsreader-latin-wght-italic.woff2", style: "italic" },
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
  for (const dir of [...IGNORED_DIRS, ...REMOVE_PATHS]) remove(p(root, dir))
  scaffoldContent(root)
  fixDangling(root)
  rebrand(root, brand)
}
