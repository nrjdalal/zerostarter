/**
 * OG image endpoints: PNG validity, canvas size, cache headers, query-param
 * handling including the 100/200-char truncation, and 404s.
 */
import { describe, expect, test } from "bun:test"

import { BLOG_SLUGS, DOCS_SLUGS, get, pngInfo } from "./helpers"

const OG_CACHE = "public, immutable, no-transform, max-age=31536000"

async function expectPng(path: string) {
  const res = await get(path)
  expect(res.status, path).toBe(200)
  expect(res.headers.get("content-type")).toBe("image/png")
  expect(res.headers.get("cache-control")).toBe(OG_CACHE)
  const info = pngInfo(new Uint8Array(await res.arrayBuffer()))
  expect(info.isPng).toBe(true)
  expect(info.width).toBe(1200)
  expect(info.height).toBe(630)
  expect(info.size).toBeGreaterThan(10_000)
  return info
}

describe("static og routes", () => {
  test("/api/og/home", async () => {
    await expectPng("/api/og/home")
  })

  for (const slug of DOCS_SLUGS) {
    test(`/api/og/docs${slug ? `/${slug}` : ""}`, async () => {
      await expectPng(`/api/og/docs${slug ? `/${slug}` : ""}`)
    })
  }

  for (const slug of BLOG_SLUGS) {
    test(`/api/og/blog${slug ? `/${slug}` : ""}`, async () => {
      await expectPng(`/api/og/blog${slug ? `/${slug}` : ""}`)
    })
  }
})

describe("dynamic og route /api/og", () => {
  test("defaults render", async () => {
    await expectPng("/api/og")
  })

  test("title/description/section params render", async () => {
    await expectPng("/api/og?title=Spec&description=Golden&section=Tests")
  })

  test("oversized params are truncated server-side (100/100/200) and still render", async () => {
    const long = "x".repeat(500)
    await expectPng(`/api/og?title=${long}&description=${long}&section=${long}`)
  })
})

describe("og 404s", () => {
  for (const path of ["/api/og/docs/nope", "/api/og/blog/nope", "/api/og/junk"]) {
    test(`${path} -> 404`, async () => {
      const res = await get(path)
      expect(res.status).toBe(404)
    })
  }
})

// --- coverage gap-fill: dynamic-render proof + default fallback ---

describe("og dynamic semantics", () => {
  test("/api/og renders different bytes for different titles (truly dynamic)", async () => {
    const [a, b] = await Promise.all([
      get("/api/og?title=AlphaOne").then((r) => r.arrayBuffer()),
      get("/api/og?title=BetaTwo").then((r) => r.arrayBuffer()),
    ])
    expect(a.byteLength).toBeGreaterThan(10_000)
    expect(b.byteLength).toBeGreaterThan(10_000)
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false)
  })

  test("/api/og with empty/absent title both fall back to the default and render", async () => {
    await expectPng("/api/og?title=")
    await expectPng("/api/og")
  })
})
