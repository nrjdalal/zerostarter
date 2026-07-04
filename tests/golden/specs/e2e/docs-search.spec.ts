import { expect, test } from "@playwright/test"

test.describe("docs search dialog", () => {
  test("opens from the sidebar trigger, finds a page, and navigates to it", async ({ page }) => {
    await page.goto("/docs")
    await page.getByPlaceholder("Search").first().click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await page.keyboard.type("architecture")
    const hit = dialog.getByText("Architecture", { exact: false }).first()
    await expect(hit).toBeVisible()
    await hit.click()

    await expect(page).toHaveURL(/\/docs\/getting-started\/architecture/)
    await expect(page.getByRole("heading", { name: "Architecture" }).first()).toBeVisible()
  })

  test("opens with the keyboard shortcut and closes with Escape", async ({ page }) => {
    await page.goto("/docs")
    await page.keyboard.press("ControlOrMeta+k")

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()
  })

  test("an unfindable query shows no docs results", async ({ page }) => {
    await page.goto("/docs")
    await page.keyboard.press("ControlOrMeta+k")
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await page.keyboard.type("zzzqqqxyzunfindable")
    await expect(dialog.getByText(/no results/i)).toBeVisible()
  })
})
