import { describe, expect, test } from "bun:test"

import { WEB_URL } from "@/urls"

describe("docs search API (/api/search)", () => {
  test("a real query returns docs hits with the fumadocs shape", async () => {
    const res = await fetch(`${WEB_URL}/api/search?query=architecture`)
    expect(res.status).toBe(200)
    const results = await res.json()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
    for (const item of results) {
      expect(typeof item.id).toBe("string")
      expect(typeof item.content).toBe("string")
      expect(item.url).toMatch(/^\/docs/)
    }
    const urls = results.map((r: { url: string }) => r.url)
    expect(urls).toContain("/docs/getting-started/architecture")
  })

  test("search matches content, not just titles", async () => {
    const res = await fetch(`${WEB_URL}/api/search?query=drizzle`)
    expect(res.status).toBe(200)
    const results = await res.json()
    expect(results.length).toBeGreaterThan(0)
  })

  test("an unfindable query returns an empty array", async () => {
    const res = await fetch(`${WEB_URL}/api/search?query=zzzqqqxyzunfindable`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  test("a missing query returns an empty array", async () => {
    const res = await fetch(`${WEB_URL}/api/search`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })
})
