import { expect, test } from "@playwright/test"

import { STORAGE_STATE, uniqueEmail } from "@/helpers"

test.use({ storageState: STORAGE_STATE })

// The dashboard org switcher: create an organization, see it become active, then delete it via the auth API so runs stay clean.
test.describe("dashboard organization switcher", () => {
  test("creates an organization and makes it the active one", async ({ page }) => {
    const orgName = `Golden Org ${uniqueEmail().split("@")[0].slice(-6)}`

    await page.goto("/dashboard")
    await expect(page.getByText("Dashboard").first()).toBeVisible()

    await page
      .getByText(/Select Organization|No organization selected/)
      .first()
      .click()
    await page.getByText("Create organization").first().click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Create a new organization")).toBeVisible()
    await dialog.getByPlaceholder("Acme Inc.").fill(orgName)
    await dialog.getByRole("button", { name: "Create organization" }).click()

    await expect(page.getByText("Organization created!")).toBeVisible()
    await expect(page.getByText(orgName).first()).toBeVisible()

    const orgs = await (await page.request.get("/api/auth/organization/list")).json()
    const created = orgs.find((o: { name: string }) => o.name === orgName)
    expect(created).toBeTruthy()

    // Better Auth rejects credentialed POSTs without a trusted Origin (CSRF protection).
    const del = await page.request.post("/api/auth/organization/delete", {
      headers: { origin: "http://localhost:3000" },
      data: { organizationId: created.id },
    })
    expect(del.ok()).toBe(true)
  })
})
