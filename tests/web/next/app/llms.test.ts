import { describe, expect, test } from "bun:test"

import { fetchOk } from "@/http"
import { DOCS_PAGES, SITE } from "@/surface"
import { WEB_URL } from "@/urls"

describe("/llms.txt index", () => {
  test("is markdown listing every docs page as a .md link", async () => {
    const res = await fetch(`${WEB_URL}/llms.txt`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/markdown")
    const text = await res.text()
    expect(text.startsWith(`# ${SITE.name}`)).toBe(true)
    expect(text).toContain("## Documentation")
    for (const [path, title] of Object.entries(DOCS_PAGES)) {
      expect(text, `missing ${path}`).toContain(`[${title}](${WEB_URL}${path}.md)`)
    }
  })
})

describe("/llms-full.txt", () => {
  test("is the whole docs corpus with the AI preamble", async () => {
    const res = await fetch(`${WEB_URL}/llms-full.txt`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/markdown")
    const text = await res.text()
    expect(text).toContain("## Instructions for AI Assistants")
    for (const title of ["Quickstart", "Architecture", "The Type-Safe API", "Database"]) {
      expect(text).toContain(title)
    }
    expect(text.length).toBeGreaterThan(50_000)
  })
})

describe("per-page markdown routes", () => {
  test("/llms.txt/docs/<slug> serves the page as markdown with the llms footer", async () => {
    const res = await fetch(`${WEB_URL}/llms.txt/docs/getting-started/setup`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/markdown")
    const text = await res.text()
    expect(text).toContain("Quickstart")
    expect(text).toContain(`${WEB_URL}/llms.txt`)
  })

  test("the .md rewrite serves the same content as the llms.txt route", async () => {
    const viaRewrite = await fetch(`${WEB_URL}/docs/getting-started/setup.md`)
    const direct = await fetch(`${WEB_URL}/llms.txt/docs/getting-started/setup`)
    expect(viaRewrite.status).toBe(200)
    expect(await viaRewrite.text()).toBe(await direct.text())
  })

  test("the .txt rewrite works for docs", async () => {
    const res = await fetch(`${WEB_URL}/docs/getting-started/setup.txt`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("Quickstart")
  })

  test("blog posts are served as markdown via .md and .txt", async () => {
    for (const ext of [".md", ".txt"]) {
      const res = await fetch(`${WEB_URL}/blog/web-development-2026${ext}`)
      expect(res.status, `blog${ext}`).toBe(200)
      expect(await res.text()).toContain("How to Do Web Development in 2026")
    }
  })

  test("every docs page is fetchable as .md", async () => {
    // 25 sequential fetches; right after a build the dev server recompiles these cold, so fetchOk retries.
    for (const path of Object.keys(DOCS_PAGES)) {
      if (path === "/docs") continue
      await fetchOk(`${WEB_URL}${path}.md`)
    }
  })

  test("unknown slugs are 404", async () => {
    for (const path of ["/llms.txt/docs/definitely-not", "/docs/definitely-not.md"]) {
      const res = await fetch(`${WEB_URL}${path}`)
      expect(res.status, path).toBe(404)
    }
  })
})
