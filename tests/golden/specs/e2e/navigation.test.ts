import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser } from "@/browser"

let browser: Browser

beforeAll(() => {
  browser = new Browser("golden-navigation")
})
afterAll(() => browser.close())

describe("landing navigation", () => {
  test("navbar links reach the docs, blog, and hire pages", () => {
    browser.open("/")
    browser.clickLink("Documentation")
    browser.waitPath("/docs")
    expect(new URL(browser.url()).pathname).toBe("/docs")

    browser.open("/")
    browser.clickLink("Blog")
    browser.waitPath("/blog")
    expect(new URL(browser.url()).pathname).toBe("/blog")

    browser.open("/")
    browser.clickLink("Hire")
    browser.waitPath("/hire")
    expect(new URL(browser.url()).pathname).toBe("/hire")
  })

  test("the API Docs navbar link points at the Scalar reference", () => {
    browser.open("/")
    const href = browser.run(["get", "attr", "a[href='/api/docs']", "href"]).stdout
    expect(href).toBe("/api/docs")
    const target = browser.run(["get", "attr", "a[href='/api/docs']", "target"]).stdout
    expect(target).toBe("_blank")
  })
})

describe("docs sidebar navigation", () => {
  test("sidebar links navigate between docs pages", () => {
    browser.open("/docs")
    expect(browser.hasText("Introduction")).toBe(true)

    browser.clickLink("Quickstart")
    browser.waitPath("/docs/getting-started/setup")
    expect(browser.hasText("Quickstart")).toBe(true)
  })
})

describe("blog navigation", () => {
  test("the index links to each post", () => {
    browser.open("/blog")
    browser.clickLink("How to Do Web Development in 2026")
    browser.waitPath("/blog/web-development-2026")
    expect(new URL(browser.url()).pathname).toBe("/blog/web-development-2026")
    expect(browser.hasText("How to Do Web Development in 2026")).toBe(true)
  })
})
