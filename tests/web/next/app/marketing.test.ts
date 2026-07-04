import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"

import { Browser } from "@/browser"
import { titleOf } from "@/html"
import { MARKETING_PAGES, SITE } from "@/surface"
import { WEB_URL } from "@/urls"

// Covers web/next/src/app/(marketing): the landing/hire/resume pages, their social metadata, and the landing-page interactions (nav, API status, theme toggle, and the agent login flow driven from the navbar). The standalone /waitlist page is tested in waitlist.test.ts.

const MARKETING_ROUTES = ["/", "/hire", "/resume"] as const

describe("marketing pages", () => {
  for (const path of MARKETING_ROUTES) {
    test(`GET ${path} renders with its exact title`, async () => {
      const res = await fetch(`${WEB_URL}${path}`)
      expect(res.status).toBe(200)
      expect(res.headers.get("content-type")).toContain("text/html")
      expect(titleOf(await res.text())).toBe(MARKETING_PAGES[path])
    })
  }

  test("an unknown page route is 404", async () => {
    expect((await fetch(`${WEB_URL}/definitely-not-a-page`)).status).toBe(404)
  })

  test("the home page declares OpenGraph and Twitter cards with a live og image", async () => {
    const html = await (await fetch(`${WEB_URL}/`)).text()
    expect(html).toMatch(/property="og:title"/)
    expect(html).toMatch(/name="twitter:card"/)
    const ogImage = html.match(/property="og:image"[^>]*content="([^"]+)"/)?.[1]
    expect(ogImage, "home page must declare an og:image").toBeTruthy()
    const image = await fetch(ogImage!.replace(/&amp;/g, "&"))
    expect(image.status).toBe(200)
    expect(image.headers.get("content-type")).toContain("image/")
  })
})

describe("landing page interactions", () => {
  let browser: Browser

  beforeAll(() => {
    browser = new Browser("zs-marketing")
    browser.open("/")
  })
  beforeEach(() => browser.clearCookies())
  afterAll(() => browser.close())

  test("the API status badge reports operational systems", () => {
    browser.open("/")
    browser.waitText("All systems are operational")
    expect(browser.hasText("All systems are operational")).toBe(true)
  })

  test("the hero renders the brand identity", () => {
    browser.open("/")
    expect(browser.hasText(SITE.name)).toBe(true)
  })

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
    expect(browser.run(["get", "attr", "a[href='/api/docs']", "href"]).stdout).toBe("/api/docs")
    expect(browser.run(["get", "attr", "a[href='/api/docs']", "target"]).stdout).toBe("_blank")
  })

  test("the theme toggle switches, persists across reload, and cycles back", () => {
    browser.open("/")
    const before = browser.htmlClass()
    browser.clickRole("button", "Switch between system/light/dark version")
    browser.waitHtmlClassChanges(before)
    const after = browser.htmlClass()
    expect(after).not.toBe(before)

    const themed = after.includes("dark") ? "dark" : "light"
    browser.run(["reload"])
    browser.run(["wait", "--load", "networkidle"])
    const persisted = browser.htmlClass()
    expect(persisted).toContain(themed)

    browser.clickRole("button", "Switch between system/light/dark version")
    browser.waitHtmlClassChanges(persisted)
    expect(browser.htmlClass()).not.toBe(persisted)
  })
})

// The full dev login round-trip is driven from the landing navbar's Access dialog: Login -> agent sign-in (API redirect) -> dashboard -> sign out.
describe("agent login flow", () => {
  let browser: Browser

  beforeAll(() => {
    browser = new Browser("zs-marketing-auth")
    browser.open("/")
  })
  beforeEach(() => browser.clearCookies())
  afterAll(() => browser.close())

  const login = () => {
    browser.open("/")
    browser.clickRole("button", "Login")
    browser.waitText("Login (agents)")
    browser.clickRole("button", "Login (agents)")
    browser.waitPath("/dashboard")
  }

  test("logs in from the landing page and reaches the dashboard", () => {
    login()
    expect(new URL(browser.url()).pathname).toBe("/dashboard")
    expect(browser.hasText("Dashboard")).toBe(true)
    expect(browser.hasText(SITE.agent.name)).toBe(true)
  })

  test("signing out returns to the landing page and re-locks the dashboard", () => {
    login()
    browser.clickSnapshotMatch(SITE.agent.name, { interactive: true })
    browser.waitText("Log out")
    browser.clickRole("menuitem", "Log out")
    browser.run(["wait", "--fn", "location.pathname === '/'"])

    browser.open("/dashboard")
    expect(new URL(browser.url()).pathname).not.toBe("/dashboard")
  })

  test("a signed-in user sees Dashboard instead of Login on the landing page", () => {
    login()
    browser.open("/")
    // The navbar swaps Login->Dashboard on a client-side session fetch (authClient.useSession) that can resolve after networkidle; wait for the authenticated control before asserting.
    browser.waitSelector('a[href="/dashboard"]')
    expect(browser.refFor('link "Dashboard"', { interactive: true, urls: true })).not.toBeNull()
    expect(browser.hasControl("Login")).toBe(false)
  })
})
