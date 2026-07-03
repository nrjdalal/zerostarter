import { join } from "node:path"

import { exists, read, readJson, remove, removeMatch, write, writeJson } from "@/io"
import {
  agentsTemplate,
  blogIndexTemplate,
  type Brand,
  consoleIndexTemplate,
  docsConfigTemplate,
  docsIndexTemplate,
  homeTemplate,
  readmeTemplate,
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

// Remove the fork excludes listed in .gitpickignore, then drop the ignore file (a no-op for gitpick fetches).
const removeForkExcludes = (root: string): void => {
  const ignore = p(root, ".gitpickignore")
  if (!exists(ignore)) return
  for (const line of read(ignore).split("\n")) {
    const path = line.trim()
    if (path && !path.startsWith("#")) remove(p(root, path))
  }
  remove(ignore)
}

// Author-only font exports + /hire nav entry to strip, matched by regex (not exact literal) so an upstream reformat of fonts.ts/navbar (quotes, indent, commas) does not break a synced fork.
const CAVEAT_EXPORT = /\nexport const caveat = localFont\(\{[\s\S]*?\n\}\)\n/
const NEWSREADER_EXPORT = /\nexport const newsreader = localFont\(\{[\s\S]*?\n\}\)\n/
const HIRE_NAV = /[ \t]*\{[^}\n]*href:[ \t]*["']\/hire["'][^}\n]*\},?[ \t]*\n/

// Write the generic stubs so the app builds clean and reads as a fresh product.
const scaffoldContent = (root: string, brand: Brand): void => {
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
  write(p(root, "README.md"), readmeTemplate(brand))
}

// Clean up the references the route and font deletes leave dangling; fail loudly on drift.
export const fixDangling = (root: string): void => {
  const fonts = p(root, "web/next/src/lib/fonts.ts")
  const caveatOk = removeMatch(fonts, CAVEAT_EXPORT)
  const newsreaderOk = removeMatch(fonts, NEWSREADER_EXPORT)
  const navOk = removeMatch(p(root, "web/next/src/components/navbar/home.tsx"), HIRE_NAV)
  if (!caveatOk || !newsreaderOk) {
    throw new Error(
      "fonts.ts: caveat/newsreader export not found (starter drift). Update packages/cli/src/convert.ts.",
    )
  }
  if (!navOk) {
    throw new Error(
      "navbar/home.tsx: /hire entry not found (starter drift). Update packages/cli/src/convert.ts.",
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
  scaffoldContent(root, brand)
  fixDangling(root)
  rebrand(root, brand)
}
