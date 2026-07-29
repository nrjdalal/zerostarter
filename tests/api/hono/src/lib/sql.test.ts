import { describe, expect, test } from "bun:test"

import { escapeLike, isUniqueViolation } from "../../../../../api/hono/src/lib/sql"

test("escapeLike leaves an ordinary term untouched", () => {
  expect(escapeLike("ada@example.com")).toBe("ada@example.com")
})

test("escapeLike neutralizes the LIKE wildcards", () => {
  expect(escapeLike("100%")).toBe("100\\%")
  expect(escapeLike("a_b")).toBe("a\\_b")
})

test("escapeLike escapes the escape character itself, so a literal backslash stays literal", () => {
  expect(escapeLike("a\\b")).toBe("a\\\\b")
})

describe("isUniqueViolation", () => {
  // What Bun's driver actually throws: the SQLSTATE is errno, and code carries a driver constant.
  const bunError = Object.assign(new Error("duplicate key value violates unique constraint"), {
    code: "ERR_POSTGRES_SERVER_ERROR",
    errno: "23505",
    name: "PostgresError",
  })

  test("recognizes the Bun driver's shape, where the SQLSTATE is errno", () => {
    expect(isUniqueViolation(bunError)).toBe(true)
  })

  test("recognizes a driver that puts the SQLSTATE in code", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true)
  })

  test("looks through the cause, which is where drizzle puts the driver error", () => {
    expect(isUniqueViolation(new Error("insert failed", { cause: bunError }))).toBe(true)
  })

  test("is not fooled by another error, another SQLSTATE, or a non-object", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false)
    expect(isUniqueViolation({ code: "ERR_POSTGRES_SERVER_ERROR", errno: "23503" })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation("23505")).toBe(false)
  })
})
