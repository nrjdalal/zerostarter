import { join } from "node:path"

import { parseForkLayout } from "@/fork-layout"
import { exists, read, readJson, remove, removeMatch, write, writeJson } from "@/io"
import { AUTHOR_FIELDS } from "@/pkg"
import { reconcileForkSkills, slugify } from "@/skills"
import {
  agentsTemplate,
  blogIndexTemplate,
  type Brand,
  consoleIndexTemplate,
  DEFAULT_FEATURES,
  docsConfigTemplate,
  docsIndexTemplate,
  type FeatureFlags,
  homeTemplate,
  readmeTemplate,
  sampleBlogPostTemplate,
  siteTemplate,
} from "@/templates"

const p = (root: string, ...parts: string[]): string => join(root, ...parts)

// Remove the fork excludes the .gitpickignore names, then drop the ignore file (a no-op for gitpick fetches, which never copy those paths). Each exclude must be a literal path: a glob would diverge from gitpick's own fetch, so fail loudly rather than half-match.
const removeForkExcludes = (root: string): void => {
  const ignore = p(root, ".gitpickignore")
  if (!exists(ignore)) return
  for (const path of parseForkLayout(read(ignore)).excludes) {
    if (/[*?![\]]/.test(path)) {
      throw new Error(
        `.gitpickignore entry "${path}" is not a literal path; the in-place converter only supports literal paths (a glob or negation would diverge from gitpick's fetch).`,
      )
    }
    remove(p(root, path))
  }
  remove(ignore)
}

// The /hire nav entry to strip from the shared navbar, matched by regex (not exact literal) so an upstream reformat (quotes, indent, commas) does not break a synced fork. Newline is \r?\n: a Windows/WSL checkout (gitpick under core.autocrlf) yields CRLF, and a \n-only anchor would miss the trailing comma/newline. The author-only marketing fonts need no such surgery: they live in their own wholesale fork-excluded module (web/next/src/lib/marketing/), not the shared fonts.ts.
const HIRE_NAV = /[ \t]*\{[^}\r\n]*href:[ \t]*["']\/hire["'][^}\r\n]*\},?[ \t]*\r?\n/

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

// Strip the dangling /hire entry the route excludes leave in the shared navbar, then fail loudly on drift.
export const fixDangling = (root: string): void => {
  const fontsPath = p(root, "web/next/src/lib/fonts.ts")
  const marketingFontsPath = p(root, "web/next/src/lib/marketing/fonts.ts")
  const navPath = p(root, "web/next/src/components/common/navbar.tsx")
  removeMatch(navPath, HIRE_NAV)
  // The author-only marketing fonts are wholesale fork-excluded (web/next/src/lib/marketing/ in .gitpickignore). If the module survived, that .gitpickignore path drifted; if the shared fonts.ts refers to fonts/marketing/, a marketing font leaked back into the file that ships to forks (whose woff2 dir does not).
  if (exists(marketingFontsPath)) {
    throw new Error(
      "web/next/src/lib/marketing/fonts.ts survived the fork strip (add web/next/src/lib/marketing/ to .gitpickignore).",
    )
  }
  if (exists(fontsPath) && read(fontsPath).includes("fonts/marketing/")) {
    throw new Error(
      "fonts.ts references fonts/marketing/; author-only marketing fonts must live in the fork-excluded web/next/src/lib/marketing/, not the shared fonts.ts.",
    )
  }
  if (exists(navPath) && /href:\s*["']\/hire["']/.test(read(navPath))) {
    throw new Error(
      "common/navbar.tsx still has the /hire entry after fixDangling (regex drift). Update packages/cli/src/convert.ts.",
    )
  }
}

// Regenerate the centralized brand file (brand + chosen feature flags), rename the root package, and rebrand the app portless dev-URL names.
const rebrand = (root: string, b: Brand, features: FeatureFlags): void => {
  write(p(root, "packages/config/src/site.ts"), siteTemplate(b, features))
  const slug = slugify(b.name)
  const path = p(root, "package.json")
  const pkg = readJson<Record<string, unknown>>(path)
  pkg.name = slug
  pkg.version = "0.0.0"
  for (const field of AUTHOR_FIELDS) delete pkg[field]
  writeJson(path, pkg)
  // Rebrand the portless dev-URL names so a fork serves <slug>.localhost, not zerostarter.localhost.
  for (const [rel, portlessName] of [
    ["web/next", slug],
    ["api/hono", `api.${slug}`],
  ] as const) {
    const appPath = p(root, rel, "package.json")
    const appPkg = readJson<Record<string, unknown>>(appPath)
    const portless = appPkg.portless
    // Fail loudly on drift, like fixDangling: a missing portless config means the dev-URL setup moved and a fork would silently keep zerostarter.localhost.
    if (!portless || typeof portless !== "object" || Array.isArray(portless)) {
      throw new Error(
        `${rel}/package.json has no "portless" object to rebrand (the dev-URL setup drifted). Update packages/cli/src/convert.ts.`,
      )
    }
    const portlessConfig = portless as Record<string, unknown>
    portlessConfig.name = portlessName
    writeJson(appPath, appPkg)
  }
}

export const convertRepo = (
  root: string,
  brand: Brand,
  features: FeatureFlags = DEFAULT_FEATURES,
): void => {
  removeForkExcludes(root)
  scaffoldContent(root, brand)
  fixDangling(root)
  rebrand(root, brand, features)
  // Reconcile the inherited skills to the fork: rename the upstream identity, point source at it, and stamp the sync note.
  reconcileForkSkills(root, brand)
}
