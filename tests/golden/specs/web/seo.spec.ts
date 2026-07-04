import { expect, test } from "@playwright/test"

import { SITEMAP_PATHS } from "@/surface"
import { WEB_URL } from "@/urls"

test.describe("robots.txt", () => {
  test("allows crawling but blocks api, console, and dashboard", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/robots.txt`)
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).toContain("Allow: /")
    expect(text).toContain("Disallow: /api/")
    expect(text).toContain("Disallow: /console/")
    expect(text).toContain("Disallow: /dashboard/")
    expect(text).toContain(`Sitemap: ${WEB_URL}/sitemap.xml`)
  })
})

test.describe("sitemap.xml", () => {
  test("contains exactly home, every docs page, and every published post", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/sitemap.xml`)
    expect(res.status()).toBe(200)
    const xml = await res.text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    const paths = locs.map((u) => new URL(u).pathname).sort()
    expect(paths).toEqual(SITEMAP_PATHS)
  })
})

test.describe("social metadata", () => {
  test("the home page declares OpenGraph and Twitter cards with a live og image", async ({
    request,
  }) => {
    const res = await request.get(`${WEB_URL}/`)
    const html = await res.text()
    expect(html).toMatch(/property="og:title"/)
    expect(html).toMatch(/name="twitter:card"/)

    const ogImage = html.match(/property="og:image"[^>]*content="([^"]+)"/)?.[1]
    expect(ogImage, "home page must declare an og:image").toBeTruthy()
    const image = await request.get(ogImage!.replace(/&amp;/g, "&"))
    expect(image.status()).toBe(200)
    expect(image.headers()["content-type"]).toContain("image/")
  })

  test("docs pages declare their own OpenGraph metadata", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/docs/getting-started/setup`)
    const html = await res.text()
    expect(html).toMatch(/property="og:title"/)
  })
})
