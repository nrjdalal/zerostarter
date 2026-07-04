import { describe, expect, test } from "bun:test"

import { SITEMAP_PATHS } from "@/surface"
import { WEB_URL } from "@/urls"

describe("robots.txt", () => {
  test("allows crawling but blocks api, console, and dashboard", async () => {
    const res = await fetch(`${WEB_URL}/robots.txt`)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain("Allow: /")
    expect(text).toContain("Disallow: /api/")
    expect(text).toContain("Disallow: /console/")
    expect(text).toContain("Disallow: /dashboard/")
    expect(text).toContain(`Sitemap: ${WEB_URL}/sitemap.xml`)
  })
})

describe("sitemap.xml", () => {
  test("contains exactly home, every docs page, and every published post", async () => {
    const res = await fetch(`${WEB_URL}/sitemap.xml`)
    expect(res.status).toBe(200)
    const xml = await res.text()
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    const paths = locs.map((u) => new URL(u).pathname).sort()
    expect(paths).toEqual(SITEMAP_PATHS)
  })
})

describe("social metadata", () => {
  test("the home page declares OpenGraph and Twitter cards with a live og image", async () => {
    const res = await fetch(`${WEB_URL}/`)
    const html = await res.text()
    expect(html).toMatch(/property="og:title"/)
    expect(html).toMatch(/name="twitter:card"/)

    const ogImage = html.match(/property="og:image"[^>]*content="([^"]+)"/)?.[1]
    expect(ogImage, "home page must declare an og:image").toBeTruthy()
    const image = await fetch(ogImage!.replace(/&amp;/g, "&"))
    expect(image.status).toBe(200)
    expect(image.headers.get("content-type")).toContain("image/")
  })

  test("docs pages declare their own OpenGraph metadata", async () => {
    const res = await fetch(`${WEB_URL}/docs/getting-started/setup`)
    const html = await res.text()
    expect(html).toMatch(/property="og:title"/)
  })
})
