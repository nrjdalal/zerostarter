import { expect, test } from "@playwright/test"

test.describe("landing navigation", () => {
  test("navbar links reach the docs, blog, and hire pages", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("link", { name: "Documentation" }).first().click()
    await expect(page).toHaveURL(/\/docs$/)

    await page.goto("/")
    await page.getByRole("link", { name: "Blog", exact: true }).first().click()
    await expect(page).toHaveURL(/\/blog$/)

    await page.goto("/")
    await page.getByRole("link", { name: "Hire", exact: true }).first().click()
    await expect(page).toHaveURL(/\/hire$/)
  })

  test("the API Docs navbar link points at the Scalar reference", async ({ page }) => {
    await page.goto("/")
    const link = page.getByRole("link", { name: "API Docs" }).first()
    await expect(link).toHaveAttribute("href", "/api/docs")
    await expect(link).toHaveAttribute("target", "_blank")
  })
})

test.describe("docs sidebar navigation", () => {
  test("sidebar links navigate between docs pages", async ({ page }) => {
    await page.goto("/docs")
    await expect(page.getByRole("heading", { name: "Introduction" }).first()).toBeVisible()

    await page.getByRole("link", { name: "Quickstart" }).first().click()
    await expect(page).toHaveURL(/\/docs\/getting-started\/setup/)
    await expect(page.getByRole("heading", { name: "Quickstart" }).first()).toBeVisible()
  })
})

test.describe("blog navigation", () => {
  test("the index links to each post", async ({ page }) => {
    await page.goto("/blog")
    await page.getByRole("link", { name: "How to Do Web Development in 2026" }).first().click()
    await expect(page).toHaveURL(/\/blog\/web-development-2026$/)
    await expect(
      page.getByRole("heading", { name: "How to Do Web Development in 2026" }).first(),
    ).toBeVisible()
  })
})
