import path from "node:path"

import { Glob } from "bun"

import docsConfig from "../../web/next/docs.config"
import {
  compareBlogPostPublishOrder,
  isBlogPostPublished,
  normalizeBlogTimestamp,
  type BlogPostMeta,
} from "../../web/next/src/lib/blog-policy"
import type { DocsCollection, DocsItem, DocsMeta } from "../../web/next/src/lib/docs"

// Derives content/<collection>/meta.json from docs.config and owns the full per-page MDX frontmatter, so authors only write the body. Page keys are full URLs; the collection base is stripped to find the .mdx and build meta.json.
// Runs in the web/next build (--strict: validate only, fail on drift/missing) and dev (write meta.json + frontmatter, scaffold missing pages). meta.json is git-ignored; docs.config is the single source.

const CONTENT = path.resolve(import.meta.dir, "../../web/next/content")

// URL base per docs.config collection; must match its loader baseUrl in source.ts. The blog is content-driven (not in docs.config); its meta.json is generated from post dates by generateBlogMeta().
const BASE: Record<string, string> = { docs: "/docs", console: "/console/docs" }

type Page = { slug: string; meta: DocsMeta }

// Collect page entries in reading order; an item keyed to an array is a subgroup, one keyed to an object is a page (key = URL). Warns on malformed multi-key items.
function pagesOf(items: DocsItem[], onWarn: (msg: string) => void): Page[] {
  const out: Page[] = []
  for (const item of items) {
    const keys = Object.keys(item)
    if (keys.length !== 1)
      onWarn(`item must have exactly one key, found [${keys.join(", ")}]; using only the first`)
    const entry = Object.entries(item)[0]
    if (!entry) continue
    const [key, value] = entry
    if (Array.isArray(value)) out.push(...pagesOf(value, onWarn))
    else out.push({ slug: key, meta: value })
  }
  return out
}

const collectionPages = (collection: DocsCollection, onWarn: (msg: string) => void): Page[] =>
  Object.values(collection).flatMap((items) => pagesOf(items, onWarn))

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

// Block-style YAML scalar; double-quotes (JSON-escaped, a subset of YAML) only when the plain form would be ambiguous.
function yamlScalar(value: string): string {
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

const toFrontmatter = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}: ${yamlScalar(value)}`)
    .join("\n") + "\n"

// Full managed frontmatter for a page; label is written only when it differs from title.
function frontmatterFields(slug: string, meta: DocsMeta): Record<string, string> {
  const fields: Record<string, string> = { slug }
  if (meta.label && meta.label !== meta.title) fields.label = meta.label
  fields.title = meta.title
  if (meta.description !== undefined) fields.description = meta.description
  return fields
}

type SyncResult = "ok" | "wrote" | "drift"

function localIsoDate(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Compares the rendered frontmatter block byte-for-byte (the generator owns it): an in-sync file never churns, and a hand edit shows up as drift.
async function syncFrontmatter(
  file: string,
  slug: string,
  meta: DocsMeta,
  strict: boolean,
): Promise<SyncResult> {
  const text = await Bun.file(file).text()
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  const desired = toFrontmatter(frontmatterFields(slug, meta))

  const currentBlock = match ? `${(match[1] ?? "").replaceAll("\r\n", "\n")}\n` : null
  if (currentBlock === desired) return "ok"
  if (strict) return "drift"

  const body = match ? (match[2] ?? "") : text.startsWith("\n") ? text : `\n${text}`
  await Bun.write(file, `---\n${desired}---\n${body}`)
  return "wrote"
}

function addBlogCreatedAt(text: string, createdAt: string): string {
  const newline = text.includes("\r\n") ? "\r\n" : "\n"
  const line = `createdAt: ${createdAt}`
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return `---${newline}${line}${newline}---${newline}${newline}${text}`

  const lines = (match[1] ?? "").split(/\r?\n/)
  lines.push(line)
  return `---${newline}${lines.join(newline)}${newline}---${newline}${match[2] ?? ""}`
}

// The blog is content-driven: each post owns its frontmatter and `publishedAt` controls order. This derives content/blog/meta.json for the page tree; public blog surfaces apply the same draft/publishedAt rule during render/revalidation.
async function generateBlogMeta(warnings: string[], strict: boolean): Promise<void> {
  const dir = "blog"
  const now = new Date()
  const slugs = await existingSlugs(dir)
  const posts: BlogPostMeta[] = []
  for (const slug of slugs) {
    if (slug === "index") continue
    const file = path.join(CONTENT, dir, `${slug}.mdx`)
    const text = await Bun.file(file).text()
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    const data = match
      ? (Bun.YAML.parse(match[1] ?? "") as {
          createdAt?: unknown
          draft?: unknown
          publishedAt?: unknown
          updatedAt?: unknown
        })
      : null
    let createdAt = normalizeBlogTimestamp(data?.createdAt)
    if (!createdAt) {
      // Dev (non-strict) builds backfill a missing createdAt into the source .mdx and log it for review/commit; --strict only warns and never mutates files.
      if (data?.createdAt === undefined && !strict) {
        createdAt = localIsoDate(now)
        await Bun.write(file, addBlogCreatedAt(text, createdAt))
        console.log(`[blog] added createdAt: ${createdAt} to ${slug}.mdx; review and commit it`)
      } else {
        const message =
          data?.createdAt === undefined
            ? `is missing a \`createdAt\` in frontmatter`
            : `has an invalid \`createdAt\` in frontmatter; expected YYYY-MM-DD or ISO datetime with timezone`
        warnings.push(`[blog] "${slug}.mdx" ${message}`)
        continue
      }
    }
    if (data?.updatedAt !== undefined && !normalizeBlogTimestamp(data.updatedAt)) {
      warnings.push(
        `[blog] "${slug}.mdx" has an invalid \`updatedAt\`; expected YYYY-MM-DD or ISO datetime with timezone`,
      )
    }
    let publishedAt: string | undefined
    if (data?.publishedAt !== undefined) {
      const normalizedPublishedAt = normalizeBlogTimestamp(data.publishedAt)
      if (!normalizedPublishedAt) {
        warnings.push(
          `[blog] "${slug}.mdx" has an invalid \`publishedAt\`; expected YYYY-MM-DD or ISO datetime with timezone`,
        )
        continue
      }
      publishedAt = normalizedPublishedAt
    } else if (data?.draft !== true) {
      warnings.push(
        `[blog] "${slug}.mdx" is missing \`publishedAt\`; add it or set \`draft: true\``,
      )
      continue
    }
    posts.push({ slug, createdAt, draft: data?.draft === true, publishedAt })
  }
  posts.sort(compareBlogPostPublishOrder)
  // meta.json (the page tree) intentionally lists only posts published at build time, so a scheduled post joins prev/next nav only after the next deploy; /blog and the runtime publish policy are the canonical public surfaces.
  const pages = [
    ...(slugs.has("index") ? ["index"] : []),
    ...posts.filter((post) => isBlogPostPublished(post, now)).map((p) => p.slug),
  ]
  await Bun.write(path.join(CONTENT, dir, "meta.json"), JSON.stringify({ pages }, null, 2) + "\n")
}

async function run() {
  const strict = process.argv.includes("--strict")
  const warnings: string[] = []

  for (const [name, collection] of Object.entries(docsConfig)) {
    const base = BASE[name]
    // Content dir mirrors the URL base: /console/docs -> content/console/docs (the on-disk path matches the route).
    const dir = base ? base.slice(1) : name
    const onWarn = (msg: string) => warnings.push(`[${name}] ${msg}`)
    const seen = new Set<string>()
    const declared = collectionPages(collection as DocsCollection, onWarn)
      .map(({ slug, meta }) => ({ slug, file: toFile(base, slug), meta }))
      .filter((page) => {
        if (seen.has(page.slug)) {
          onWarn(`duplicate slug in docs.config: "${page.slug}" (skipped)`)
          return false
        }
        seen.add(page.slug)
        return true
      })

    const declaredFiles = new Set(
      declared.map((page) => page.file).filter((file): file is string => file !== null),
    )
    const existing = await existingSlugs(dir)
    for (const fileSlug of existing) {
      if (!declaredFiles.has(fileSlug))
        onWarn(`"${fileSlug}.mdx" exists but is not listed in docs.config`)
    }

    for (const { slug, file, meta } of declared) {
      if (file === null) {
        onWarn(`"${slug}" is not under the ${name} base (${base})`)
        continue
      }
      const filePath = path.join(CONTENT, dir, `${file}.mdx`)
      if (!existing.has(file)) {
        if (strict) {
          onWarn(`"${slug}" (${file}.mdx) is in docs.config but has no file`)
          continue
        }
        await Bun.write(filePath, `---\n${toFrontmatter(frontmatterFields(slug, meta))}---\n\n`)
        existing.add(file)
        console.log(`[${name}] created ${file}.mdx`)
        continue
      }
      const result = await syncFrontmatter(filePath, slug, meta, strict)
      if (result === "drift") onWarn(`"${file}.mdx" frontmatter is out of sync with docs.config`)
      else if (result === "wrote") console.log(`[${name}] synced ${file}.mdx frontmatter`)
    }

    const metaPages: string[] = []
    const inMeta = new Set<string>()
    for (const { file } of declared) {
      if (file === null || !existing.has(file) || inMeta.has(file)) continue
      inMeta.add(file)
      metaPages.push(file)
    }
    await Bun.write(
      path.join(CONTENT, dir, "meta.json"),
      JSON.stringify({ pages: metaPages }, null, 2) + "\n",
    )
  }

  await generateBlogMeta(warnings, strict)

  if (warnings.length) {
    const log = strict ? console.error : console.warn
    log(`\ndocs ${strict ? "error" : "warning"}(s):\n${warnings.map((w) => `  - ${w}`).join("\n")}`)
    if (strict) {
      console.error(
        "\nRun `bun .github/scripts/docs.ts` (or start the dev server) to regenerate, then commit.\n",
      )
      process.exit(1)
    }
    console.warn("")
  }
}

run()
