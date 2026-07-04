import { afterAll, beforeAll, describe, expect, test } from "bun:test"

import { Browser } from "@/browser"
import { uniqueEmail } from "@/http"
import { SITE } from "@/surface"

let browser: Browser

beforeAll(() => {
  browser = new Browser("golden-waitlist")
})
afterAll(() => browser.close())

describe("waitlist form", () => {
  test("a valid email joins and shows the success state", () => {
    browser.open("/waitlist")
    expect(browser.hasText(SITE.name)).toBe(true)

    browser.fillPlaceholder("you@example.com", uniqueEmail("e2e"))
    browser.clickRole("button", "Join the waitlist")

    browser.waitText("You're on the list.")
    expect(browser.dialogOpen()).toBe(false)
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
    const offscreen = browser.eval(
      "(() => { const el = document.querySelector('input[name=subject]'); const r = el.getBoundingClientRect(); return r.right < 0 || r.left > window.innerWidth; })()",
    )
    expect(offscreen).toBe("true")
  })
})
