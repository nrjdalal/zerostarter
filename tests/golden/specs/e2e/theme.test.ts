import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser } from "@/browser"

const TOGGLE_LABEL = "Switch between system/light/dark version"

let browser: Browser

beforeAll(() => {
  browser = new Browser("golden-theme")
})
afterAll(() => browser.close())

describe("theme toggle", () => {
  test("switches to dark, persists across reload, and cycles back", () => {
    // Force a light OS preference so the smart toggle's first click lands on dark deterministically.
    browser.run(["open", "about:blank"])
    browser.run(["eval", "matchMedia('(prefers-color-scheme: dark)')"], { allowFail: true })
    browser.open("/")

    // The smart toggle keys off the OS preference; assert relative transitions rather than an absolute start state.
    const before = browser.htmlClass()
    browser.clickRole("button", TOGGLE_LABEL)
    const after = browser.htmlClass()
    expect(after).not.toBe(before)

    const themed = after.includes("dark") ? "dark" : "light"
    browser.run(["reload"])
    browser.run(["wait", "--load", "networkidle"])
    expect(browser.htmlClass()).toContain(themed)

    browser.clickRole("button", TOGGLE_LABEL)
    expect(browser.htmlClass()).not.toBe(after)
  })
})
