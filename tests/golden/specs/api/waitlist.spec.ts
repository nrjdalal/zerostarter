import { expect, test } from "@playwright/test"

import { expectErrorEnvelope, uniqueEmail } from "@/helpers"
import { API_URL } from "@/urls"

test.describe("GET /api/waitlist", () => {
  test("returns a display-ready count: 0 below the threshold, else a multiple of 5", async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/api/waitlist`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Object.keys(body)).toEqual(["data"])
    const { count } = body.data
    expect(typeof count).toBe("number")
    expect(count === 0 || (count >= 10 && count % 5 === 0)).toBe(true)
  })
})

test.describe("POST /api/waitlist", () => {
  test("accepts a valid email", async ({ request }) => {
    const res = await request.post(`${API_URL}/api/waitlist`, {
      headers: { "content-type": "application/json" },
      data: { email: uniqueEmail() },
    })
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ data: { message: "ok" } })
  })

  test("joining twice with the same email is idempotent", async ({ request }) => {
    const email = uniqueEmail("dup")
    for (let i = 0; i < 2; i++) {
      const res = await request.post(`${API_URL}/api/waitlist`, {
        headers: { "content-type": "application/json" },
        data: { email },
      })
      expect(res.status()).toBe(200)
      expect(await res.json()).toEqual({ data: { message: "ok" } })
    }
  })

  test("email whitespace is trimmed and casing accepted", async ({ request }) => {
    const res = await request.post(`${API_URL}/api/waitlist`, {
      headers: { "content-type": "application/json" },
      data: { email: `  ${uniqueEmail("Trim").toUpperCase()}  ` },
    })
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ data: { message: "ok" } })
  })

  test("a filled honeypot is silently accepted (bots see success)", async ({ request }) => {
    const res = await request.post(`${API_URL}/api/waitlist`, {
      headers: { "content-type": "application/json" },
      data: { email: uniqueEmail("bot"), subject: "I am a bot" },
    })
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ data: { message: "ok" } })
  })

  test("an invalid email is a 400 VALIDATION_ERROR with issues", async ({ request }) => {
    const res = await request.post(`${API_URL}/api/waitlist`, {
      headers: { "content-type": "application/json" },
      data: { email: "not-an-email" },
    })
    const body = await expectErrorEnvelope(res, 400, "VALIDATION_ERROR", "Invalid email address")
    expect(Array.isArray(body.error.issues)).toBe(true)
    expect(body.error.issues.length).toBeGreaterThan(0)
  })

  test("a missing email is a 400 VALIDATION_ERROR", async ({ request }) => {
    const res = await request.post(`${API_URL}/api/waitlist`, {
      headers: { "content-type": "application/json" },
      data: {},
    })
    await expectErrorEnvelope(res, 400, "VALIDATION_ERROR", "Invalid email address")
  })

  test("an email over 254 characters is a 400 VALIDATION_ERROR", async ({ request }) => {
    const email = `${"a".repeat(250)}@example.com`
    const res = await request.post(`${API_URL}/api/waitlist`, {
      headers: { "content-type": "application/json" },
      data: { email },
    })
    await expectErrorEnvelope(res, 400, "VALIDATION_ERROR", "Invalid email address")
  })

  test("malformed JSON is a 400 in the error envelope", async ({ request }) => {
    const res = await request.post(`${API_URL}/api/waitlist`, {
      headers: { "content-type": "application/json" },
      data: "{not json",
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(Object.keys(body)).toEqual(["error"])
    expect(["BAD_REQUEST", "VALIDATION_ERROR"]).toContain(body.error.code)
  })
})
