import { describe, expect, test } from "bun:test"

import {
  ERROR_CODES,
  errorComponents,
  errorEnvelope,
} from "../../../../../api/hono/src/lib/error-schema"

describe("errorComponents", () => {
  test("publishes the envelope as a named Error schema with the full code enum", () => {
    const error = errorComponents.Error as {
      properties: {
        error: {
          properties: { code: { enum: string[] }; message: { type: string } }
          required: string[]
        }
      }
      required: string[]
      type: string
    }
    expect(error.type).toBe("object")
    expect(error.required).toEqual(["error"])
    expect(error.properties.error.required).toEqual(["code", "message"])
    expect(error.properties.error.properties.code.enum).toEqual([...ERROR_CODES])
    expect(error.properties.error.properties.message.type).toBe("string")
  })

  test("publishes the validation variant with its optional issues", () => {
    const validation = errorComponents.ValidationError as {
      properties: { error: { properties: { issues: { type: string } }; required: string[] } }
    }
    expect(validation.properties.error.properties.issues.type).toBe("array")
    expect(validation.properties.error.required).toEqual(["code", "message"])
  })

  test("the named schema and the runtime envelope agree on what a valid error looks like", () => {
    expect(
      errorEnvelope.safeParse({ error: { code: "NOT_FOUND", message: "Not found" } }).success,
    ).toBe(true)
    expect(errorEnvelope.safeParse({ error: { code: "NOPE", message: "x" } }).success).toBe(false)
  })
})
