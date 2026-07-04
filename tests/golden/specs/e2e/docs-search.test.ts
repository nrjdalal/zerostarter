import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser, SEARCH_HOTKEY } from "@/browser"

let browser: Browser

beforeAll(() => {
  browser = new Browser("golden-docs-search")
})
afterAll(() => browser.close())

describe("docs search dialog", () => {
  test("opens from the sidebar trigger, finds a page, and navigates to it", () => {
    browser.open("/docs")
    browser.press(SEARCH_HOTKEY)
    browser.waitDialogOpen()
    browser.fillPlaceholder("Search", "architecture")
    // Search is debounced and async, so wait for result buttons (beyond the textbox + close) to populate.
    browser.run(["wait", "--fn", "document.querySelectorAll('[role=dialog] button').length > 2"])

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
})
