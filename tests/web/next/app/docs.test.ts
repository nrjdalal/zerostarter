import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser, SEARCH_HOTKEY } from "@/browser"
import { htmlEscape, titleOf } from "@/html"
import { fetchOk } from "@/http"
import { DOCS_PAGES } from "@/surface"
import { WEB_URL } from "@/urls"

// Covers web/next/src/app/(content)/docs and its search backend web/next/src/app/api/search: every docs page renders with its title, the /api/search route, and the search dialog + sidebar navigation.

describe("docs pages (all of them)", () => {
  for (const [path, title] of Object.entries(DOCS_PAGES)) {
    test(`GET ${path} renders "${title}"`, async () => {
      const html = await (await fetchOk(`${WEB_URL}${path}`)).text()
      expect(titleOf(html)).toBe(htmlEscape(`${title} | ZeroStarter`))
      expect(html).toContain(htmlEscape(title))
    })
  }

  test("docs pages declare their own OpenGraph metadata", async () => {
    const html = await (await fetch(`${WEB_URL}/docs/getting-started/setup`)).text()
    expect(html).toMatch(/property="og:title"/)
  })

  for (const path of ["/docs/definitely-not"]) {
    test(`GET ${path} is 404`, async () => {
      expect((await fetch(`${WEB_URL}${path}`)).status).toBe(404)
    })
  }
})

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
    expect(results.map((r: { url: string }) => r.url)).toContain(
      "/docs/getting-started/architecture",
    )
  })

  test("search matches content, not just titles", async () => {
    const results = await (await fetch(`${WEB_URL}/api/search?query=drizzle`)).json()
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

describe("docs search dialog", () => {
  let browser: Browser

  beforeAll(() => {
    browser = new Browser("zs-docs")
  })
  afterAll(() => browser.close())

  test("opens from the sidebar trigger, finds a page, and navigates to it", () => {
    browser.open("/docs")
    browser.press(SEARCH_HOTKEY)
    browser.waitDialogOpen()
    browser.fillPlaceholder("Search", "architecture")
    // Results stream in async; wait for the specific result to land, not just for any buttons to appear (a generic count can fire a tick before the target row renders).
    browser.run([
      "wait",
      "--fn",
      "Array.from(document.querySelectorAll('[role=dialog] button')).some((b) => b.textContent.includes('Architecture'))",
    ])

    const snap = browser.snapshot({ interactive: false })
    expect(snap).toContain('dialog "Search"')
    expect(snap).toContain("Docs Architecture")

    browser.clickSnapshotMatch("Docs Architecture")
    browser.waitPath("/docs/getting-started/architecture")
    expect(new URL(browser.url()).pathname).toBe("/docs/getting-started/architecture")
  })

  test("opens with the keyboard shortcut and closes with Escape", () => {
    browser.open("/docs")
    browser.press(SEARCH_HOTKEY)
    browser.waitDialogOpen()
    expect(browser.dialogOpen()).toBe(true)

    browser.press("Escape")
    browser.waitDialogClosed()
    expect(browser.dialogOpen()).toBe(false)
  })

  test("an unfindable query shows no docs results", () => {
    browser.open("/docs")
    browser.press(SEARCH_HOTKEY)
    browser.waitDialogOpen()
    browser.fillPlaceholder("Search", "zzzqqqxyzunfindable")
    expect(browser.hasText("No results found")).toBe(true)
  })

  test("sidebar links navigate between docs pages", () => {
    browser.open("/docs")
    expect(browser.hasText("Introduction")).toBe(true)
    browser.clickLink("Quickstart")
    browser.waitPath("/docs/getting-started/setup")
    expect(browser.hasText("Quickstart")).toBe(true)
  })
})
