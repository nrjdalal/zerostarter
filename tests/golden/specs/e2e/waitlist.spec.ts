import { expect, test } from "@playwright/test"

import { uniqueEmail } from "@/helpers"
import { SITE } from "@/surface"

test.describe("waitlist form", () => {
  test("a valid email joins and shows the success state", async ({ page }) => {
    await page.goto("/waitlist")
    await expect(page.getByRole("heading", { name: SITE.name })).toBeVisible()

    await page.getByPlaceholder("you@example.com").fill(uniqueEmail("e2e"))
    await page.getByRole("button", { name: "Join the waitlist" }).click()

    await expect(page.getByText("You're on the list.")).toBeVisible()
    await expect(page.getByPlaceholder("you@example.com")).not.toBeVisible()
  })

  test("an invalid email shows the field error and never submits", async ({ page }) => {
    await page.goto("/waitlist")

    await page.getByPlaceholder("you@example.com").fill("not-an-email")
    await page.getByRole("button", { name: "Join the waitlist" }).click()

    await expect(page.getByText("Please enter a valid email address.")).toBeVisible()
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible()
  })

  test("the honeypot field is invisible to humans", async ({ page }) => {
    await page.goto("/waitlist")
    const honeypot = page.locator('input[name="subject"]')
    await expect(honeypot).toHaveCount(1)
    await expect(honeypot).not.toBeInViewport()
  })
})
