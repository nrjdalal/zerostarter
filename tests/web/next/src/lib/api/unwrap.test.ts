import { describe, expect, test } from "bun:test"

import {
  ApiRequestError,
  unwrap,
  unwrapOrThrow,
} from "../../../../../../web/next/src/lib/api/unwrap"

// Generic in the body so SuccessData resolves to the real payload type rather than never, which is what a caller sees.
const responds = <B>(ok: boolean, body: B) => Promise.resolve({ json: async () => body, ok })
const rejects = (): Promise<{ json: () => Promise<unknown>; ok: boolean }> =>
  Promise.reject(new Error("connection refused"))

describe("unwrap", () => {
  test("reads the data envelope", async () => {
    const result = await unwrap(responds(true, { data: { count: 3 } }))
    expect(result).toEqual({ data: { count: 3 }, error: null })
  })

  test("reads the error envelope, keeping the code the API sent", async () => {
    const result = await unwrap(
      responds(false, { error: { code: "FORBIDDEN", message: "You cannot ban an owner." } }),
    )
    expect(result.data).toBeNull()
    expect(result.error).toEqual({ code: "FORBIDDEN", message: "You cannot ban an owner." })
  })

  test("preserves extras beside code and message, so validation issues survive", async () => {
    const issues = [{ path: ["email"] }]
    const result = await unwrap(
      responds(false, { error: { code: "VALIDATION_ERROR", issues, message: "Invalid input" } }),
    )
    expect(result.error).not.toBeNull()
    expect(result.error && result.error.issues).toEqual(issues)
  })

  test("falls back when the envelope carries no usable code or message", async () => {
    const result = await unwrap(responds(false, { error: { code: "", message: "" } }))
    expect(result.error).toEqual({ code: "ERROR", message: "Request failed" })
  })

  test("a body that is neither envelope is UNKNOWN_ERROR, not a crash", async () => {
    const result = await unwrap(responds(false, { nonsense: true }))
    expect(result.error).toEqual({ code: "UNKNOWN_ERROR", message: "Unexpected response" })
  })

  test("a 200 without a data key is still UNKNOWN_ERROR", async () => {
    const result = await unwrap(responds(true, { count: 3 }))
    expect(result.error).toEqual({ code: "UNKNOWN_ERROR", message: "Unexpected response" })
  })

  test("a transport failure is NETWORK_ERROR", async () => {
    const result = await unwrap(rejects())
    expect(result.error).toEqual({ code: "NETWORK_ERROR", message: "Network request failed" })
  })

  test("an unreadable body is NETWORK_ERROR rather than a throw", async () => {
    const result = await unwrap(
      Promise.resolve({
        json: async () => {
          throw new SyntaxError("Unexpected token <")
        },
        ok: true,
      }),
    )
    expect(result.error).toEqual({ code: "NETWORK_ERROR", message: "Network request failed" })
  })

  test("never throws, whatever the call does", async () => {
    expect(await unwrap(rejects())).toBeDefined()
    expect(await unwrap(responds(false, null))).toBeDefined()
  })
})

describe("unwrapOrThrow", () => {
  test("returns the payload directly on success", async () => {
    expect(await unwrapOrThrow(responds(true, { data: { count: 3 } }))).toEqual({ count: 3 })
  })

  test("throws ApiRequestError carrying the code, which a bare Error would have dropped", async () => {
    const call = unwrapOrThrow(responds(false, { error: { code: "CONFLICT", message: "Raced." } }))
    await expect(call).rejects.toThrow(ApiRequestError)
    try {
      await call
      throw new Error("expected a rejection")
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError)
      const thrown = error as ApiRequestError
      expect(thrown.code).toBe("CONFLICT")
      expect(thrown.message).toBe("Raced.")
      expect(thrown.error.code).toBe("CONFLICT")
    }
  })

  test("a transport failure arrives as NETWORK_ERROR, not a swallowed null", async () => {
    try {
      await unwrapOrThrow(rejects())
      throw new Error("expected a rejection")
    } catch (error) {
      expect((error as ApiRequestError).code).toBe("NETWORK_ERROR")
    }
  })
})
