import { expect, test } from "bun:test"

import { usersQuerySchema } from "../../../../../api/hono/src/lib/admin-query"

const parse = (query: Record<string, string>) => usersQuerySchema.parse(query)

test("an empty query defaults to the newest-first first page", () => {
  expect(parse({})).toEqual({ dir: "desc", page: 1, perPage: 10, role: [], sort: "createdAt" })
})

test("role parses as a comma list and dedupes", () => {
  expect(parse({ role: "admin,user,admin" }).role).toEqual(["admin", "user"])
})

test("an unknown role is rejected rather than reaching the query", () => {
  expect(() => parse({ role: "superuser" })).toThrow()
})

test("sort is whitelisted", () => {
  expect(parse({ sort: "email" }).sort).toBe("email")
  expect(() => parse({ sort: "password" })).toThrow()
})

test("page and perPage are bounded on both ends", () => {
  expect(parse({ page: "10000", perPage: "100" })).toMatchObject({ page: 10000, perPage: 100 })
  expect(() => parse({ page: "0" })).toThrow()
  expect(() => parse({ page: "10001" })).toThrow()
  expect(() => parse({ perPage: "101" })).toThrow()
})

test("q is trimmed and capped at the length the client clamps to", () => {
  expect(parse({ q: "  ada  " }).q).toBe("ada")
  expect(parse({ q: "a".repeat(254) }).q).toHaveLength(254)
  expect(() => parse({ q: "a".repeat(255) })).toThrow()
})
