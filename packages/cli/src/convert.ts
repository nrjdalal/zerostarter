import { join } from "node:path"

import { exists, read, readJson, remove, removeMatch, write, writeJson } from "@/io"
import { AUTHOR_FIELDS } from "@/pkg"
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
    if (!path || path.startsWith("#")) continue
    if (/[*?![\]]/.test(path)) {
      throw new Error(
        `.gitpickignore entry "${path}" is not a literal path; the in-place converter only supports literal paths (a glob or negation would diverge from gitpick's fetch).`,
      )
    }
    remove(p(root, path))
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
  const fontsPath = p(root, "web/next/src/lib/fonts.ts")
  const navPath = p(root, "web/next/src/components/navbar/home.tsx")
  removeMatch(fontsPath, CAVEAT_EXPORT)
  removeMatch(fontsPath, NEWSREADER_EXPORT)
  removeMatch(navPath, HIRE_NAV)
  // A gone marker is fine (the starter dropped it, so sync over an evolving main is a no-op); one that survived the strip means the regex drifted and must be fixed, else the fork ships refs to the excluded fonts/route.
  if (exists(fontsPath) && read(fontsPath).includes("fonts/marketing/")) {
    throw new Error(
      "fonts.ts still references fonts/marketing/ after fixDangling (regex drift). Update packages/cli/src/convert.ts.",
    )
  }
  if (exists(navPath) && /href:\s*["']\/hire["']/.test(read(navPath))) {
    throw new Error(
      "navbar/home.tsx still has the /hire entry after fixDangling (regex drift). Update packages/cli/src/convert.ts.",
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
  for (const field of AUTHOR_FIELDS) delete pkg[field]
  writeJson(path, pkg)
}

export const convertRepo = (root: string, brand: Brand): void => {
  removeForkExcludes(root)
  scaffoldContent(root, brand)
  fixDangling(root)
  rebrand(root, brand)
}
