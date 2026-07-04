import { expect, test } from "@playwright/test"

import { STORAGE_STATE } from "@/helpers"

// Admin console flows, using the shared agent session (role admin).
test.use({ storageState: STORAGE_STATE })

test.describe("admin console", () => {
  test("the console home renders for an admin", async ({ page }) => {
    await page.goto("/console")
    await expect(page.getByText("Console").first()).toBeVisible()
  })

  test("console docs render with their own search", async ({ page }) => {
    await page.goto("/console/docs")
    await expect(page.getByPlaceholder("Search").first()).toBeVisible()
  })

  test("console search API works inside an admin browser session", async ({ page }) => {
    await page.goto("/console")
    const res = await page.request.get("/api/console/search?query=console")
    expect(res.status()).toBe(200)
    expect(Array.isArray(await res.json())).toBe(true)
  })

  test("the dashboard renders for the signed-in agent", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText("Dashboard").first()).toBeVisible()
  })
})
