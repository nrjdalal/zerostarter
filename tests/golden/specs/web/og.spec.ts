import { expect, test } from "@playwright/test"

import { WEB_URL } from "@/urls"

async function expectPng(res: import("@playwright/test").APIResponse, label: string) {
  expect(res.status(), label).toBe(200)
  expect(res.headers()["content-type"], label).toContain("image/png")
  expect((await res.body()).length, label).toBeGreaterThan(1000)
}

test.describe("dynamic OG images", () => {
  test("GET /og/home renders the home card", async ({ request }) => {
    await expectPng(await request.get(`${WEB_URL}/og/home`), "/og/home")
  })

  test("GET /og renders the default card and accepts custom copy", async ({ request }) => {
    await expectPng(await request.get(`${WEB_URL}/og`), "/og")
    await expectPng(
      await request.get(`${WEB_URL}/og?title=Golden&description=Suite&section=Tests`),
      "/og with params",
    )
  })

  test("GET /og/docs renders the docs default and per-page cards", async ({ request }) => {
    await expectPng(await request.get(`${WEB_URL}/og/docs`), "/og/docs")
    await expectPng(
      await request.get(`${WEB_URL}/og/docs/getting-started/setup`),
      "/og/docs/getting-started/setup",
    )
  })

  test("GET /og/blog renders per-post cards", async ({ request }) => {
    await expectPng(
      await request.get(`${WEB_URL}/og/blog/web-development-2026`),
      "/og/blog/web-development-2026",
    )
  })

  test("unknown og slugs are 404", async ({ request }) => {
    const res = await request.get(`${WEB_URL}/og/docs/definitely-not`)
    expect(res.status()).toBe(404)
  })
})
