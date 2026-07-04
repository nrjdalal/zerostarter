import { expect, test } from "@playwright/test"

import { SITE } from "@/surface"

// The full dev login round-trip: landing -> Access dialog -> agent sign-in (API redirect) -> dashboard -> sign out.
test.describe("agent login flow", () => {
  test("logs in from the landing page and reaches the dashboard", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("button", { name: "Login", exact: true }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await dialog.getByRole("button", { name: "Login (agents)" }).click()
    await page.waitForURL(/\/dashboard/)
    await expect(page.getByText("Dashboard").first()).toBeVisible()
    await expect(page.getByText(SITE.agent.name).first()).toBeVisible()
  })

  test("signing out returns to the landing page and re-locks the dashboard", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Login", exact: true }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Login (agents)" }).click()
    await page.waitForURL(/\/dashboard/)

    await page.getByText(SITE.agent.name).first().click()
    await page.getByText("Log out").click()
    await page.waitForURL(/\/$|\/\?/)

    await page.goto("/dashboard")
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  test("a signed-in user sees Dashboard instead of Login on the landing page", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Login", exact: true }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Login (agents)" }).click()
    await page.waitForURL(/\/dashboard/)

    await page.goto("/")
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible()
    await expect(page.getByRole("button", { name: "Login", exact: true })).not.toBeVisible()
  })
})
