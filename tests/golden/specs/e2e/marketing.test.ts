import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser } from "@/browser"
import { SITE } from "@/surface"

let browser: Browser

beforeAll(() => {
  browser = new Browser("golden-marketing")
})
afterAll(() => browser.close())

describe("landing page widgets", () => {
  test("the API status badge reports operational systems", () => {
    browser.open("/")
    browser.waitText("All systems are operational")
    expect(browser.hasText("All systems are operational")).toBe(true)
  })

  test("the hero renders the brand identity", () => {
    browser.open("/")
    expect(browser.hasText(SITE.name)).toBe(true)
  })
})
