/**
 * Head metadata per page: the title template, OpenGraph/Twitter card sets,
 * og:logo, busted og image URLs, and structural head tags.
 */
import { describe, expect, test } from "bun:test"

import {
  APP_DESCRIPTION,
  APP_NAME,
  BASE,
  BLOG_SLUGS,
  BLOG_TITLES,
  DEFAULT_TITLE,
  DOCS_SLUGS,
  DOCS_TITLES,
  extractHead,
  get,
  MODE,
} from "./helpers"

async function headOf(path: string) {
  const res = await get(path)
  expect(res.status).toBe(200)
  return extractHead(await res.text())
}

describe("home metadata", () => {
  test("default title without template suffix + full og/twitter set", async () => {
    const head = await headOf("/")
    expect(head.title).toBe(DEFAULT_TITLE)
    expect(head.metas["description"]).toBe(APP_DESCRIPTION)
    expect(head.metas["og:title"]).toBe(DEFAULT_TITLE)
    expect(head.metas["og:description"]).toBe(APP_DESCRIPTION)
    expect(head.metas["og:url"]).toBe(BASE)
    expect(head.metas["og:site_name"]).toBe(APP_NAME)
    expect(head.metas["og:type"]).toBe("website")
    expect(head.metas["og:image"]).toBe(`${BASE}/og/home.png`)
    expect(head.metas["og:image:width"]).toBe("1200")
    expect(head.metas["og:image:height"]).toBe("630")
    expect(head.metas["og:image:alt"]).toBe(DEFAULT_TITLE)
    expect(head.metas["og:logo"]).toBe(`${BASE}/favicon.ico`)
    expect(head.metas["twitter:card"]).toBe("summary_large_image")
    expect(head.metas["twitter:title"]).toBe(DEFAULT_TITLE)
    expect(head.metas["twitter:description"]).toBe(APP_DESCRIPTION)
    expect(head.metas["twitter:image"]).toBe(`${BASE}/og/home.png`)
  })

  test("og image url carries a cache buster", async () => {
    const res = await get("/")
    const raw = (await res.text()).match(/property="og:image" content="([^"]+)"/)?.[1]
    expect(raw).toMatch(/\?t=\d+$/)
  })
})

describe("docs/blog page metadata", () => {
  const cases: {
    path: string
    title: string
    og: string
    type: string
  }[] = []
  for (const slug of DOCS_SLUGS) {
    cases.push({
      path: slug ? `/docs/${slug}` : "/docs",
      title: DOCS_TITLES[slug],
      og: slug ? `${BASE}/api/og/docs/${slug}` : `${BASE}/api/og/docs`,
      type: "website",
    })
  }
  for (const slug of BLOG_SLUGS) {
    cases.push({
      path: slug ? `/blog/${slug}` : "/blog",
      title: BLOG_TITLES[slug],
      og: slug ? `${BASE}/api/og/blog/${slug}` : `${BASE}/api/og/blog`,
      type: "article",
    })
  }

  for (const { path, title: pageTitle, og, type } of cases) {
    test(`${path}: "%s | ${APP_NAME}" template + og set`, async () => {
      const head = await headOf(path)
      const title = `${pageTitle} | ${APP_NAME}`
      expect(head.title).toBe(title)
      expect(head.metas["description"]).toBeTruthy()
      expect(head.metas["og:title"]).toBe(title)
      expect(head.metas["og:description"]).toBeTruthy()
      expect(head.metas["og:url"]).toBe(`${BASE}${path}`)
      expect(head.metas["og:site_name"]).toBe(APP_NAME)
      expect(head.metas["og:type"]).toBe(type)
      expect(head.metas["og:image"]).toBe(og)
      expect(head.metas["og:image:alt"]).toBe(pageTitle)
      expect(head.metas["og:logo"]).toBe(`${BASE}/favicon.ico`)
      expect(head.metas["twitter:card"]).toBe("summary_large_image")
      expect(head.metas["twitter:title"]).toBe(title)
      expect(head.metas["twitter:image"]).toBe(og)
    })
  }
})

describe("structural head tags", () => {
  test("charset, viewport, favicon link, lang", async () => {
    const res = await get("/")
    const html = await res.text()
    const head = extractHead(html)
    expect(head.metas["viewport"]).toBe("width=device-width, initial-scale=1")
    expect(html).toMatch(/<meta charSet="utf-8"\/?>/i)
    expect(html).toMatch(/<html[^>]*lang="en"/)
    expect(head.links.some((l) => l.rel === "icon" && l.href.includes("favicon"))).toBe(true)
  })
})

describe("page content markers", () => {
  test("home: hero copy", async () => {
    const html = await (await get("/")).text()
    expect(html).toContain("Go from 0 to production in")
    expect(html).toContain("15 minutes")
  })

  test("hire: name heading and tagline", async () => {
    const html = await (await get("/hire")).text()
    expect(html).toContain("nrjdalal")
    expect(html).toContain("Crafting software that makes a difference.")
  })

  test(`navbar on / is ${MODE === "dev" ? "visible (dev)" : "hidden (prod)"}`, async () => {
    const html = await (await get("/")).text()
    const hasNav = html.includes('aria-label="Main navigation"')
    expect(hasNav).toBe(MODE === "dev")
  })

  test("navbar renders on /docs with nav links and login", async () => {
    const html = await (await get("/docs")).text()
    expect(html).toContain('aria-label="Main navigation"')
    expect(html).toContain(">Documentation<")
    expect(html).toContain(">Blog<")
    expect(html).toContain('href="/api/docs"') // external API docs link
    expect(html).toContain(">Login<")
    expect(html).toContain('aria-label="Switch between system/light/dark version"')
  })

  test("docs page renders sidebar chrome and version footer", async () => {
    const html = await (await get("/docs")).text()
    expect(html).toContain("Getting Started")
    expect(html).toContain("Deployment")
    expect(html).toMatch(/v(<!-- -->)?\d+\.\d+\.\d+/) // version in sidebar footer
    expect(html).toContain('placeholder="Search"')
  })

  test("docs page h1 includes copy-as-markdown affordance", async () => {
    const html = await (await get("/docs/getting-started/architecture")).text()
    expect(html).toContain('aria-label="Copy as markdown"')
  })

  test("blog index hides toc and footer, blog post shows content", async () => {
    const index = await (await get("/blog")).text()
    expect(index).toContain("How to Do Web Development in 2026")
    const post = await (await get("/blog/web-development-2026")).text()
    expect(post).toContain("How to Do Web Development in 2026")
    expect(post).not.toContain('aria-label="Copy as markdown"') // docs-only affordance
  })
})

// --- coverage gap-fill: metadata completeness + port-stable markers ---

describe("metadata gap-fill", () => {
  test("docs/blog pages carry og:image dimensions and a twitter:description", async () => {
    for (const path of ["/docs", "/blog", "/docs/getting-started/architecture"]) {
      const head = await headOf(path)
      expect(head.metas["og:image:width"], path).toBe("1200")
      expect(head.metas["og:image:height"], path).toBe("630")
      // twitter:description mirrors the page description (present, not absent)
      expect(head.metas["twitter:description"], path).toBe(head.metas["description"])
    }
  })

  test("API Docs nav link opens in a new tab", async () => {
    const html = await (await get("/docs")).text()
    const anchor = html.match(/<a[^>]*href="\/api\/docs"[^>]*>/)?.[0] ?? ""
    expect(anchor).toContain('target="_blank"')
    expect(anchor).toContain('rel="noopener noreferrer"')
  })

  test("document shell carries antialiased html and min-h-dvh body", async () => {
    const html = await (await get("/")).text()
    expect(html).toMatch(/<html[^>]*class="[^"]*antialiased/)
    expect(html).toMatch(/<body[^>]*class="[^"]*min-h-dvh/)
  })

  test("docs page renders a TOC; blog index does not", async () => {
    const docs = await (await get("/docs/getting-started/architecture")).text()
    expect(docs).toContain('id="nd-toc"')
    const blog = await (await get("/blog")).text()
    expect(blog).not.toContain('id="nd-toc"')
  })

  test("docs index page also exposes copy-as-markdown", async () => {
    const html = await (await get("/docs")).text()
    expect(html).toContain('aria-label="Copy as markdown"')
  })
})
