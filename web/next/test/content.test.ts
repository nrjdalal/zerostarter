/**
 * Content endpoints: robots.txt, sitemap.xml, the llms.txt family, and the
 * .md/.txt alias rewrites. Bodies are asserted as golden text where stable.
 */
import { describe, expect, test } from "bun:test"

import { APP_DESCRIPTION, APP_NAME, BASE, DOCS_PAGES, DOCS_SLUGS, get } from "./helpers"

const MD_CONTENT_TYPE = "text/markdown; charset=utf-8"

describe("robots.txt", () => {
  test("exact body", async () => {
    const res = await get("/robots.txt")
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(
      `User-Agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/

Sitemap: ${BASE}/sitemap.xml
`,
    )
  })
})

describe("sitemap.xml", () => {
  test("MVP phase: empty urlset", async () => {
    const res = await get("/sitemap.xml")
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toStartWith("application/xml")
    expect(await res.text()).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>
`,
    )
  })
})

describe("/llms.txt index", () => {
  test("lists docs pages in meta.json order plus blog pointer", async () => {
    const res = await get("/llms.txt")
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe(MD_CONTENT_TYPE)
    const text = await res.text()

    expect(text).toStartWith(`# ${APP_NAME}\n\n> ${APP_DESCRIPTION}\n`)
    expect(text).toContain(`## Documentation`)
    expect(text).toContain(`- [Blog](${BASE}/blog.md)`)

    // every docs page linked as .md, in meta.json order
    const linkLines = DOCS_SLUGS.map((slug) => {
      const page = DOCS_PAGES[slug]
      const url = slug ? `${BASE}/docs/${slug}.md` : `${BASE}/docs.md`
      return `- [${page.title}](${url}): ${page.description}`
    })
    let cursor = -1
    for (const line of linkLines) {
      const idx = text.indexOf(line)
      expect(idx, `missing or out of order: ${line}`).toBeGreaterThan(cursor)
      cursor = idx
    }
  })
})

describe("/llms.txt/<section> indexes and pages", () => {
  test("/llms.txt/docs returns the docs index page content with footer", async () => {
    const res = await get("/llms.txt/docs")
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toStartWith(`# [Introduction](${BASE}/docs)`)
    expect(text).toEndWith(
      `> To find navigation and other pages in this documentation, fetch the llms.txt file at: ${BASE}/llms.txt`,
    )
  })

  test("/llms.txt/blog returns the blog listing", async () => {
    const res = await get("/llms.txt/blog")
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain("## Blog")
    expect(text).toContain(`- [Hello, World](${BASE}/blog/hello-world.md)`)
    expect(text).toContain(`- [Documentation](${BASE}/llms.txt)`)
  })

  for (const slug of DOCS_SLUGS.filter(Boolean)) {
    test(`/llms.txt/docs/${slug} serves the page markdown`, async () => {
      const res = await get(`/llms.txt/docs/${slug}`)
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toStartWith(`# [${DOCS_PAGES[slug].title}](${BASE}/docs/${slug})`)
      // docs pages carry the navigation footer
      expect(text).toContain("fetch the llms.txt file at:")
    })
  }

  test("/llms.txt/blog/hello-world serves the post markdown without docs footer", async () => {
    const res = await get("/llms.txt/blog/hello-world")
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toStartWith(`# [Hello, World](${BASE}/blog/hello-world)`)
    expect(text).not.toContain("fetch the llms.txt file at:")
  })

  test("unknown sections and slugs 404", async () => {
    for (const path of ["/llms.txt/junk", "/llms.txt/docs/nope", "/llms.txt/blog/nope"]) {
      const res = await get(path)
      expect(res.status, path).toBe(404)
    }
  })
})

describe("/llms-full.txt", () => {
  test("authoritative context file with all pages joined", async () => {
    const res = await get("/llms-full.txt")
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe(MD_CONTENT_TYPE)
    const text = await res.text()

    expect(text).toStartWith(`# ${APP_NAME} – LLM Context File`)
    expect(text).toContain("## Instructions for AI Assistants")
    expect(text).toContain("**Monorepo Structure:**")
    expect(text).toContain("## Canonical Tech Stack (Authoritative)")
    expect(text).toContain("## Project Constraints and Rules")
    expect(text).toContain('No semicolons (Oxfmt config: `"semi": false`)')

    // every docs + blog page included (blog index excluded)
    for (const slug of DOCS_SLUGS) {
      const page = DOCS_PAGES[slug]
      expect(text).toContain(`# [${page.title}](${BASE}/docs${slug ? `/${slug}` : ""})`)
    }
    expect(text).toContain(`# [Hello, World](${BASE}/blog/hello-world)`)
    expect(text).not.toContain(`# [Blog](${BASE}/blog)`)

    // pages separated by horizontal rules
    expect(text.split("\n\n---\n\n").length).toBeGreaterThanOrEqual(DOCS_SLUGS.length + 1)
  })
})

describe(".md/.txt aliases (rewrites)", () => {
  const aliasPairs: [string, string][] = [
    ["/docs.md", "/llms.txt/docs"],
    ["/docs.txt", "/llms.txt/docs"],
    ["/blog.md", "/llms.txt/blog"],
    ["/blog.txt", "/llms.txt/blog"],
  ]
  for (const slug of DOCS_SLUGS.filter(Boolean)) {
    aliasPairs.push([`/docs/${slug}.md`, `/llms.txt/docs/${slug}`])
    aliasPairs.push([`/docs/${slug}.txt`, `/llms.txt/docs/${slug}`])
  }
  aliasPairs.push(["/blog/hello-world.md", "/llms.txt/blog/hello-world"])
  aliasPairs.push(["/blog/hello-world.txt", "/llms.txt/blog/hello-world"])

  for (const [alias, canonical] of aliasPairs) {
    test(`${alias} serves the same bytes as ${canonical}`, async () => {
      const [a, b] = await Promise.all([get(alias), get(canonical)])
      expect(a.status).toBe(200)
      expect(b.status).toBe(200)
      expect(a.headers.get("content-type")).toBe(MD_CONTENT_TYPE)
      expect(await a.text()).toBe(await b.text())
    })
  }

  test("alias for a missing slug 404s", async () => {
    for (const path of ["/docs/nope.md", "/blog/nope.txt"]) {
      const res = await get(path)
      expect(res.status, path).toBe(404)
    }
  })
})

// --- coverage gap-fill (port oracle breadth) ---

describe("content gap-fill", () => {
  test("robots.txt is text/plain", async () => {
    const res = await get("/robots.txt")
    expect(res.headers.get("content-type")).toStartWith("text/plain")
  })

  test("/llms.txt index carries the Optional section and blog description", async () => {
    const text = await (await get("/llms.txt")).text()
    expect(text).toContain("## Optional")
    expect(text).toContain(
      `- [Blog](${BASE}/blog.md): Latest articles and updates about ${APP_NAME}`,
    )
  })

  test("/llms.txt/blog carries the Optional section and Documentation pointer", async () => {
    const text = await (await get("/llms.txt/blog")).text()
    expect(text).toContain("## Optional")
    expect(text).toContain(
      `- [Documentation](${BASE}/llms.txt): Complete documentation for ${APP_NAME}`,
    )
  })

  test("intermediate llms.txt segments without a page 404", async () => {
    for (const p of ["/llms.txt/docs/design-system", "/llms.txt/docs/design-system/foundations"]) {
      expect((await get(p)).status, p).toBe(404)
    }
  })

  test(".md alias for an intermediate non-page 404s", async () => {
    expect((await get("/docs/design-system.md")).status).toBe(404)
  })
})
