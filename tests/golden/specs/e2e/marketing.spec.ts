import { expect, test } from "@playwright/test"

import { SITE } from "@/surface"

test.describe("landing page widgets", () => {
  test("the API status badge reports operational systems", async ({ page }) => {
    await page.goto("/")
    const status = page.getByRole("status", { name: "API status" })
    await expect(status).toBeVisible()
    await expect(status).toHaveText(/All systems are operational/)
  })

  test("the hero renders the brand identity", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText(SITE.name).first()).toBeVisible()
  })
})
