import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser } from "@/browser"
import { htmlEscape, titleOf } from "@/html"
import { fetchOk } from "@/http"
import { BLOG_POSTS } from "@/surface"
import { WEB_URL } from "@/urls"

// Covers web/next/src/app/(content)/blog: the index lists every published post, each post renders, and the index links navigate.

describe("blog pages", () => {
  test("GET /blog renders the index listing every post", async () => {
    const html = await (await fetchOk(`${WEB_URL}/blog`)).text()
    expect(titleOf(html)).toBe("Blog | ZeroStarter")
    for (const title of Object.values(BLOG_POSTS)) {
      expect(html, `blog index should list the full title: ${title}`).toContain(htmlEscape(title))
    }
  })

  for (const [path, title] of Object.entries(BLOG_POSTS)) {
    test(`GET ${path} renders the post`, async () => {
      const html = await (await fetchOk(`${WEB_URL}${path}`)).text()
      expect(titleOf(html)).toBe(htmlEscape(`${title} | ZeroStarter`))
    })
  }

  test("GET /blog/definitely-not is 404", async () => {
    expect((await fetch(`${WEB_URL}/blog/definitely-not`)).status).toBe(404)
  })
})

describe("blog navigation", () => {
  let browser: Browser

  beforeAll(() => {
    browser = new Browser("zs-blog")
  })
  afterAll(() => browser.close())

  test("the index links to each post", () => {
    browser.open("/blog")
    browser.clickLink("How to Do Web Development in 2026")
    browser.waitPath("/blog/web-development-2026")
    expect(new URL(browser.url()).pathname).toBe("/blog/web-development-2026")
    expect(browser.hasText("How to Do Web Development in 2026")).toBe(true)
  })
})
