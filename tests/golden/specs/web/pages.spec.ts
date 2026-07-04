import { expect, test } from "@playwright/test"

import { BLOG_POSTS, DOCS_PAGES, MARKETING_PAGES } from "@/surface"
import { WEB_URL } from "@/urls"

function titleOf(html: string): string {
  return html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""
}

function htmlEscape(text: string): string {
  return text.replace(/&/g, "&amp;")
}

test.describe("marketing pages", () => {
  for (const [path, title] of Object.entries(MARKETING_PAGES)) {
    test(`GET ${path} renders with its exact title`, async ({ request }) => {
      const res = await request.get(`${WEB_URL}${path}`)
      expect(res.status()).toBe(200)
      expect(res.headers()["content-type"]).toContain("text/html")
      expect(titleOf(await res.text())).toBe(title)
    })
  }
})

test.describe("docs pages (all of them)", () => {
  for (const [path, title] of Object.entries(DOCS_PAGES)) {
    test(`GET ${path} renders "${title}"`, async ({ request }) => {
      const res = await request.get(`${WEB_URL}${path}`)
      expect(res.status()).toBe(200)
      const html = await res.text()
      expect(titleOf(html)).toBe(htmlEscape(`${title} | ZeroStarter`))
      expect(html).toContain(htmlEscape(title))
    })
  }
})

test.describe("blog", () => {
  test("GET /blog renders the index", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/blog`)
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(titleOf(html)).toBe("Blog | ZeroStarter")
    for (const title of Object.values(BLOG_POSTS)) {
      expect(html).toContain(title.replace(/&/g, "&amp;").slice(0, 40))
    }
  })

  for (const [path, title] of Object.entries(BLOG_POSTS)) {
    test(`GET ${path} renders the post`, async ({ request }) => {
      const res = await request.get(`${WEB_URL}${path}`)
      expect(res.status()).toBe(200)
      const html = await res.text()
      expect(titleOf(html)).toBe(`${title} | ZeroStarter`)
    })
  }
})

test.describe("unknown routes are 404", () => {
  for (const path of ["/definitely-not-a-page", "/docs/definitely-not", "/blog/definitely-not"]) {
    test(`GET ${path} is 404`, async ({ request }) => {
      const res = await request.get(`${WEB_URL}${path}`)
      expect(res.status()).toBe(404)
    })
  }
})
