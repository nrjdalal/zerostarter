import { describe, expect, test } from "bun:test"

import { paging } from "../../../../../api/hono/src/lib/paging"

describe("paging", () => {
  test("echoes what was asked, so a caller never has to remember it", () => {
    expect(paging({ page: 2, perPage: 25, total: 80 })).toEqual({
      hasNextPage: true,
      page: 2,
      perPage: 25,
      total: 80,
    })
  })

  test("there is more when rows remain past this page", () => {
    expect(paging({ page: 1, perPage: 25, total: 42 }).hasNextPage).toBe(true)
  })

  test("a page that ends exactly on the last row is the last page", () => {
    // The boundary the whole end signal turns on: 2 * 25 is 50, and 50 rows is all of them.
    expect(paging({ page: 2, perPage: 25, total: 50 }).hasNextPage).toBe(false)
    expect(paging({ page: 2, perPage: 25, total: 51 }).hasNextPage).toBe(true)
  })

  test("an empty result has no next page, whatever page was asked for", () => {
    expect(paging({ page: 1, perPage: 25, total: 0 }).hasNextPage).toBe(false)
    expect(paging({ page: 9, perPage: 25, total: 0 }).hasNextPage).toBe(false)
  })

  test("a page past the end stops rather than inviting another request", () => {
    // What the removed client-side guard used to absorb: asking for page 9 of 7 rows ends the list.
    expect(paging({ page: 9, perPage: 25, total: 7 }).hasNextPage).toBe(false)
  })

  test("one row at a time still terminates on the last row", () => {
    expect(paging({ page: 6, perPage: 1, total: 7 }).hasNextPage).toBe(true)
    expect(paging({ page: 7, perPage: 1, total: 7 }).hasNextPage).toBe(false)
  })
})
