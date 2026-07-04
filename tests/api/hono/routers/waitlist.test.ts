import { describe, expect, test } from "bun:test"

import { expectErrorEnvelope, uniqueEmail } from "@/http"
import { API_URL } from "@/urls"

function join(body: unknown) {
  return fetch(`${API_URL}/api/waitlist`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

describe("GET /api/waitlist", () => {
  test("returns a display-ready count: 0 below the threshold, else a multiple of 5", async () => {
    const res = await fetch(`${API_URL}/api/waitlist`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.keys(body)).toEqual(["data"])
    const { count } = body.data
    expect(typeof count).toBe("number")
    expect(count === 0 || (count >= 10 && count % 5 === 0)).toBe(true)
  })
})

describe("POST /api/waitlist", () => {
  test("accepts a valid email", async () => {
    const res = await join({ email: uniqueEmail() })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { message: "ok" } })
  })

  test("joining twice with the same email is idempotent", async () => {
    const email = uniqueEmail("dup")
    for (let i = 0; i < 2; i++) {
      const res = await join({ email })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ data: { message: "ok" } })
    }
  })

  test("email whitespace is trimmed and casing accepted", async () => {
    const res = await join({ email: `  ${uniqueEmail("Trim").toUpperCase()}  ` })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { message: "ok" } })
  })

  test("a filled honeypot is silently accepted (bots see success)", async () => {
    const res = await join({ email: uniqueEmail("bot"), subject: "I am a bot" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { message: "ok" } })
  })

  test("an invalid email is a 400 VALIDATION_ERROR with issues", async () => {
    const res = await join({ email: "not-an-email" })
    const body = await expectErrorEnvelope(res, 400, "VALIDATION_ERROR", "Invalid email address")
    const issues = (body.error as { issues?: unknown[] }).issues
    expect(Array.isArray(issues)).toBe(true)
    expect(issues!.length).toBeGreaterThan(0)
  })

  test("a missing email is a 400 VALIDATION_ERROR", async () => {
    const res = await join({})
    await expectErrorEnvelope(res, 400, "VALIDATION_ERROR", "Invalid email address")
  })

  test("an email over 254 characters is a 400 VALIDATION_ERROR", async () => {
    const res = await join({ email: `${"a".repeat(250)}@example.com` })
    await expectErrorEnvelope(res, 400, "VALIDATION_ERROR", "Invalid email address")
  })

  test("malformed JSON is a 400 in the error envelope", async () => {
    const res = await join("{not json")
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(Object.keys(body)).toEqual(["error"])
    expect(["BAD_REQUEST", "VALIDATION_ERROR"]).toContain(body.error.code)
  })
})
