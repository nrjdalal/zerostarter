import path from "node:path"

import { Glob } from "bun"

import docsConfig from "../../web/next/docs.config"
import type { DocsCollection, DocsItem, DocsMeta } from "../../web/next/src/lib/docs/types"

// Derives content/<collection>/meta.json (reading order + prev/next) from docs.config and owns
// the per-page frontmatter (slug/title/description/publish, plus label when it differs from title)
// MDX, so authors only write the body. Page keys are full URLs; the collection base is stripped
// to locate the .mdx and to build meta.json. Runs inside the web/next build and dev scripts:
// without --strict (dev) it writes meta.json + frontmatter and scaffolds missing pages; with
// --strict (build) it validates only and fails on any drift or missing file, never writing.
// meta.json is git-ignored; docs.config is the single source.

const CONTENT = path.resolve(import.meta.dir, "../../web/next/content")

// URL base per collection; must match the fumadocs loader baseUrl in web/next/src/lib/source.ts.
const BASE: Record<string, string> = { docs: "/docs", console: "/console/docs" }

type Page = { slug: string; meta: DocsMeta }

// Recursively collect page entries in reading order. An item keyed to an array is a subgroup;
// an item keyed to an object is a page (key = URL).
function pagesOf(items: DocsItem[]): Page[] {
  const out: Page[] = []
  for (const item of items) {
    const entry = Object.entries(item)[0]
    if (!entry) continue
    const [key, value] = entry
    if (Array.isArray(value)) out.push(...pagesOf(value))
    else out.push({ slug: key, meta: value })
  }
  return out
}

const collectionPages = (collection: DocsCollection): Page[] =>
  Object.values(collection).flatMap(pagesOf)

// Map a page URL to its content file (relative, no extension); null if it is not under the base.
function toFile(base: string | undefined, slug: string): string | null {
  if (!base) return null
  if (slug === base) return "index"
  if (slug.startsWith(`${base}/`)) return slug.slice(base.length + 1)
  return null
}

async function existingSlugs(dir: string): Promise<Set<string>> {
  const slugs = new Set<string>()
  const glob = new Glob("**/*.mdx")
  for await (const file of glob.scan({ cwd: path.join(CONTENT, dir) })) {
    slugs.add(file.replaceAll("\\", "/").replace(/\.mdx$/, ""))
  }
  return slugs
}

// Block-style YAML scalar, double-quoting (JSON-escaped, a subset of YAML's) only when the plain
// form would be ambiguous.
function yamlScalar(value: string | boolean): string {
  if (typeof value === "boolean") return String(value)
  const needsQuote =
    value === "" ||
    value !== value.trim() ||
    /^[-?:,[\]{}#&*!|>'"%@`]/.test(value) ||
    /:(\s|$)/.test(value) ||
    /\s#/.test(value) ||
    /[\n\t]/.test(value) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(value) ||
    /^[-+]?(\d|\.\d)/.test(value)
  return needsQuote ? JSON.stringify(value) : value
}

const toFrontmatter = (fields: Record<string, string | boolean>): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}: ${yamlScalar(value)}`)
    .join("\n") + "\n"

// The full managed frontmatter for a page, with defaults expanded (nav -> title, publish -> true).
function frontmatterFields(slug: string, meta: DocsMeta): Record<string, string | boolean> {
  const fields: Record<string, string | boolean> = { slug }
  if (meta.label && meta.label !== meta.title) fields.label = meta.label
  fields.title = meta.title
  if (meta.description !== undefined) fields.description = meta.description
  fields.publish = meta.publish ?? true
  return fields
}

type SyncResult = "ok" | "wrote" | "drift"

// The generator owns the whole frontmatter, so it compares the rendered block byte-for-byte: an
// already-synced file never churns, and any hand edit shows up as drift.
async function syncFrontmatter(
  file: string,
  slug: string,
  meta: DocsMeta,
  strict: boolean,
): Promise<SyncResult> {
  const text = await Bun.file(file).text()
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  const desired = toFrontmatter(frontmatterFields(slug, meta))

  const currentBlock = match ? `${match[1] ?? ""}\n` : null
  if (currentBlock === desired) return "ok"
  if (strict) return "drift"

  const body = match ? (match[2] ?? "") : text.startsWith("\n") ? text : `\n${text}`
  await Bun.write(file, `---\n${desired}---\n${body}`)
  return "wrote"
}

async function run() {
  const strict = process.argv.includes("--strict")
  const warnings: string[] = []

  for (const [name, collection] of Object.entries(docsConfig)) {
    const base = BASE[name]
    const declared = collectionPages(collection as DocsCollection).map(({ slug, meta }) => ({
      slug,
      file: toFile(base, slug),
      meta,
    }))

    const seen = new Set<string>()
    for (const { slug } of declared) {
      if (seen.has(slug)) warnings.push(`[${name}] duplicate slug in docs.config: "${slug}"`)
      seen.add(slug)
    }

    const declaredFiles = new Set(
      declared.map((page) => page.file).filter((file): file is string => file !== null),
    )
    const existing = await existingSlugs(name)
    for (const fileSlug of existing) {
      if (!declaredFiles.has(fileSlug)) {
        warnings.push(`[${name}] "${fileSlug}.mdx" exists but is not listed in docs.config`)
      }
    }

    for (const { slug, file, meta } of declared) {
      if (file === null) {
        warnings.push(`[${name}] "${slug}" is not under the ${name} base (${base})`)
        continue
      }
      const filePath = path.join(CONTENT, name, `${file}.mdx`)
      if (!existing.has(file)) {
        if (strict) {
          warnings.push(`[${name}] "${slug}" (${file}.mdx) is in docs.config but has no file`)
          continue
        }
        await Bun.write(filePath, `---\n${toFrontmatter(frontmatterFields(slug, meta))}---\n\n`)
        existing.add(file)
        console.log(`[${name}] created ${file}.mdx`)
        continue
      }
      const result = await syncFrontmatter(filePath, slug, meta, strict)
      if (result === "drift") {
        warnings.push(`[${name}] "${file}.mdx" frontmatter is out of sync with docs.config`)
      } else if (result === "wrote") {
        console.log(`[${name}] synced ${file}.mdx frontmatter`)
      }
    }

    const metaPages: string[] = []
    const inMeta = new Set<string>()
    for (const { file, meta } of declared) {
      if (meta.publish === false || file === null || !existing.has(file) || inMeta.has(file))
        continue
      inMeta.add(file)
      metaPages.push(file)
    }
    await Bun.write(
      path.join(CONTENT, name, "meta.json"),
      JSON.stringify({ pages: metaPages }, null, 2) + "\n",
    )
  }

  if (warnings.length) {
    const log = strict ? console.error : console.warn
    log(
      `\ndocs ${strict ? "error" : "warning"}(s):\n${warnings.map((w) => `  - ${w}`).join("\n")}\n`,
    )
    if (strict) process.exit(1)
  }
}

run()
