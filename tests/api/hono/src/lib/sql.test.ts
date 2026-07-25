import { expect, test } from "bun:test"

import { escapeLike } from "../../../../../api/hono/src/lib/sql"

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
