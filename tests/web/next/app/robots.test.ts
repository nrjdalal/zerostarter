import { describe, expect, test } from "bun:test"

import { WEB_URL } from "@/urls"

// Covers web/next/src/app/robots.ts: crawling is allowed but the api, console, and dashboard trees are disallowed, and the sitemap is linked.
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
