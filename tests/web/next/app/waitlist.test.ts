import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser } from "@/browser"
import { titleOf } from "@/html"
import { uniqueEmail } from "@/http"
import { MARKETING_PAGES, SITE } from "@/surface"
import { WEB_URL } from "@/urls"

// Covers web/next/src/app/waitlist: the page renders, and the join form handles success, validation, and the bot honeypot. The /api/waitlist backend it posts to is tested in api/hono/routers/waitlist.test.ts.

describe("waitlist page", () => {
  test("GET /waitlist renders with its exact title", async () => {
    const res = await fetch(`${WEB_URL}/waitlist`)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    expect(titleOf(await res.text())).toBe(MARKETING_PAGES["/waitlist"])
  })
})

describe("waitlist form", () => {
  let browser: Browser

  beforeAll(() => {
    browser = new Browser("zs-waitlist")
  })
  afterAll(() => browser.close())

  test("a valid email joins and shows the success state", () => {
    browser.open("/waitlist")
    expect(browser.hasText(SITE.name)).toBe(true)

    browser.fillPlaceholder("you@example.com", uniqueEmail("e2e"))
    browser.clickRole("button", "Join the waitlist")

    browser.waitText("You're on the list.")
    expect(
      browser.evalBool("!document.querySelector('input[placeholder=\"you@example.com\"]')"),
    ).toBe(true)
  })

  test("an invalid email shows the field error and never submits", () => {
    browser.open("/waitlist")
    browser.fillPlaceholder("you@example.com", "not-an-email")
    browser.clickRole("button", "Join the waitlist")

    browser.waitText("Please enter a valid email address.")
    expect(
      browser.evalBool("!!document.querySelector('input[placeholder=\"you@example.com\"]')"),
    ).toBe(true)
  })

  test("the honeypot field is invisible to humans", () => {
    browser.open("/waitlist")
    expect(browser.evalBool("document.querySelectorAll('input[name=subject]').length === 1")).toBe(
      true,
    )
    // Off-screen (absolute, -left-[9999px]) so a human never sees or tabs to it.
    expect(
      browser.eval(
        "(() => { const el = document.querySelector('input[name=subject]'); const r = el.getBoundingClientRect(); return r.right < 0 || r.left > window.innerWidth; })()",
      ),
    ).toBe("true")
  })
})
