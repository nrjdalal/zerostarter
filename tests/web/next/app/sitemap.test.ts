import { describe, expect, test } from "bun:test"

import { SITEMAP_PATHS } from "@/surface"
import { WEB_URL } from "@/urls"

// Covers web/next/src/app/sitemap.ts: the generated sitemap must list exactly home, every docs page, and every published post.
describe("sitemap.xml", () => {
  test("contains exactly home, every docs page, and every published post", async () => {
    const res = await fetch(`${WEB_URL}/sitemap.xml`)
    expect(res.status).toBe(200)
    const xml = await res.text()
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => new URL(m[1]).pathname)
      .sort()
    expect(paths).toEqual(SITEMAP_PATHS)
  })
})
