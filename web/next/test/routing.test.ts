/**
 * Routing layer: every route's status, headers, redirects, 404s, and method
 * behavior. Run with the dev stack up (see the dev skill):
 *   bun test web/next/test/
 */
import { describe, expect, test } from "bun:test"

import { BASE, BLOG_SLUGS, DOCS_SLUGS, get } from "./helpers"

const htmlPages = [
  "/",
  "/hire",
  ...DOCS_SLUGS.map((s) => (s ? `/docs/${s}` : "/docs")),
  ...BLOG_SLUGS.map((s) => (s ? `/blog/${s}` : "/blog")),
]

describe("html pages", () => {
  for (const path of htmlPages) {
    test(`GET ${path} -> 200 text/html`, async () => {
      const res = await get(path)
      expect(res.status).toBe(200)
      expect(res.headers.get("content-type")).toStartWith("text/html")
    })

    test(`HEAD ${path} -> 200`, async () => {
      const res = await get(path, { method: "HEAD" })
      expect(res.status).toBe(200)
    })
  }
})

describe("non-html routes", () => {
  const paths = ["/robots.txt", "/sitemap.xml", "/llms.txt"]
  for (const path of paths) {
    test(`GET ${path} -> 200`, async () => {
      const res = await get(path)
      expect(res.status).toBe(200)
    })

    test(`HEAD ${path} -> 200`, async () => {
      const res = await get(path, { method: "HEAD" })
      expect(res.status).toBe(200)
    })
  }
})

describe("404s", () => {
  const notFound = [
    "/nonexistent",
    "/docs/getting-started", // intermediate path without a page
    "/docs/manage",
    "/docs/nope",
    "/blog/nope",
    "/DOCS", // routes are case-sensitive
  ]
  for (const path of notFound) {
    test(`GET ${path} -> 404`, async () => {
      const res = await get(path)
      expect(res.status).toBe(404)
    })
  }

  test("404 page renders the not-found copy", async () => {
    const res = await get("/nonexistent")
    const text = await res.text()
    expect(text).toContain("404")
    expect(text).toContain("This page could not be found")
  })
})

describe("trailing slash normalization", () => {
  // /dashboard/ is excluded on purpose: it is auth-gated, so anonymously its first hop can be
  // either the trailing-slash normalize (-> /dashboard) or the auth redirect (-> /) depending on
  // middleware order. The anonymous /dashboard redirect is asserted in "protected routes" below.
  const paths = ["/docs/", "/blog/", "/docs/getting-started/setup/", "/llms.txt/"]
  for (const path of paths) {
    test(`${path} redirects to ${path.replace(/\/+$/, "")}`, async () => {
      const res = await get(path)
      expect(res.status).toBeGreaterThanOrEqual(300)
      expect(res.status).toBeLessThan(400)
      const location = new URL(res.headers.get("location")!, BASE)
      expect(location.pathname).toBe(path.replace(/\/+$/, ""))
    })
  }
})

describe("favicon", () => {
  test("GET /favicon.ico -> 200 ico", async () => {
    const res = await get("/favicon.ico")
    expect(res.status).toBe(200)
    expect(["image/x-icon", "image/vnd.microsoft.icon"]).toContain(
      res.headers.get("content-type")?.split(";")[0] ?? "",
    )
  })
})

describe("protected routes", () => {
  test("GET /dashboard anonymous -> redirect to /", async () => {
    const res = await get("/dashboard")
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(new URL(res.headers.get("location")!, BASE).pathname).toBe("/")
  })
})

// Exact redirect status codes (308 vs 307) and the framework-default 404
// <title> are deliberately NOT pinned: they're framework impl detail a
// cross-framework port legitimately changes. The portable contract — 3xx +
// redirect target, and 404 status + body copy — is asserted above.
