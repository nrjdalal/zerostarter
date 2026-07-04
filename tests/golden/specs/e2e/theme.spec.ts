import { expect, test } from "@playwright/test"

const TOGGLE_LABEL = "Switch between system/light/dark version"

test.describe("theme toggle", () => {
  test("switches to dark, persists across reload, and cycles back", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto("/")

    const html = page.locator("html")
    await expect(html).not.toHaveClass(/dark/)

    // System (light OS) -> dark
    await page.getByRole("button", { name: TOGGLE_LABEL }).first().click()
    await expect(html).toHaveClass(/dark/)

    await page.reload()
    await expect(html).toHaveClass(/dark/)

    // Dark on a light OS -> back to system (light)
    await page.getByRole("button", { name: TOGGLE_LABEL }).first().click()
    await expect(html).not.toHaveClass(/dark/)
  })
})
