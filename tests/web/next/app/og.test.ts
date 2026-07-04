import { describe, expect, test } from "bun:test"

import { WEB_URL } from "@/urls"

async function expectPng(res: Response, label: string) {
  expect(res.status, label).toBe(200)
  expect(res.headers.get("content-type"), label).toContain("image/png")
  expect((await res.arrayBuffer()).byteLength, label).toBeGreaterThan(1000)
}

describe("dynamic OG images", () => {
  test("GET /og/home renders the home card", async () => {
    await expectPng(await fetch(`${WEB_URL}/og/home`), "/og/home")
  })

  test("GET /og renders the default card and accepts custom copy", async () => {
    await expectPng(await fetch(`${WEB_URL}/og`), "/og")
    await expectPng(
      await fetch(`${WEB_URL}/og?title=Golden&description=Suite&section=Tests`),
      "/og with params",
    )
  })

  test("GET /og/docs renders the docs default and per-page cards", async () => {
    await expectPng(await fetch(`${WEB_URL}/og/docs`), "/og/docs")
    await expectPng(
      await fetch(`${WEB_URL}/og/docs/getting-started/setup`),
      "/og/docs/getting-started/setup",
    )
  })

  test("GET /og/blog renders per-post cards", async () => {
    await expectPng(
      await fetch(`${WEB_URL}/og/blog/web-development-2026`),
      "/og/blog/web-development-2026",
    )
  })

  test("unknown og slugs are 404", async () => {
    const res = await fetch(`${WEB_URL}/og/docs/definitely-not`)
    expect(res.status).toBe(404)
  })
})
