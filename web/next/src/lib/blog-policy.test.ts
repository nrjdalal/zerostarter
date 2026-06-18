import { describe, expect, test } from "bun:test"

import {
  blogTimestampToDate,
  compareBlogPublications,
  isPublishedBlogPublication,
  normalizeBlogTimestamp,
  type BlogPublication,
} from "./blog-policy"

describe("normalizeBlogTimestamp", () => {
  test("rejects invalid calendar dates", () => {
    expect(normalizeBlogTimestamp("2026-02-29")).toBeNull()
    expect(normalizeBlogTimestamp("2026-13-01")).toBeNull()
    expect(normalizeBlogTimestamp("2026-06-31")).toBeNull()
    expect(normalizeBlogTimestamp("2026-06-18T09:15:00")).toBeNull()
  })

  test("accepts date-only and offset datetime values", () => {
    expect(normalizeBlogTimestamp("2026-06-18")).toBe("2026-06-18")
    expect(normalizeBlogTimestamp("2026-06-18T09:15:00+05:30")).toBe("2026-06-18T09:15:00+05:30")
  })

  test("parses date-only values at the start of the UTC day", () => {
    expect(blogTimestampToDate("2026-06-18")?.toISOString()).toBe("2026-06-18T00:00:00.000Z")
  })
})

describe("isPublishedBlogPublication", () => {
  test("publishes date-only timestamps at midnight UTC", () => {
    const publication = { publishedAt: "2026-06-18" }

    expect(isPublishedBlogPublication(publication, new Date("2026-06-17T23:59:59.999Z"))).toBe(
      false,
    )
    expect(isPublishedBlogPublication(publication, new Date("2026-06-18T00:00:00.000Z"))).toBe(true)
  })

  test("publishes offset datetimes at the exact instant", () => {
    const publication = { publishedAt: "2026-06-18T09:15:00+05:30" }

    expect(isPublishedBlogPublication(publication, new Date("2026-06-18T03:44:59.999Z"))).toBe(
      false,
    )
    expect(isPublishedBlogPublication(publication, new Date("2026-06-18T03:45:00.000Z"))).toBe(true)
  })

  test("keeps drafts and missing publishedAt values hidden", () => {
    expect(
      isPublishedBlogPublication(
        { draft: true, publishedAt: "2026-06-18" },
        new Date("2026-06-18T00:00:00.000Z"),
      ),
    ).toBe(false)
    expect(isPublishedBlogPublication({}, new Date("2026-06-18T00:00:00.000Z"))).toBe(false)
  })
})

describe("compareBlogPublications", () => {
  test("sorts newest first by publishedAt", () => {
    const posts: BlogPublication[] = [
      { slug: "earlier", createdAt: "2026-06-18", publishedAt: "2026-06-18T09:00:00+05:30" },
      { slug: "later", createdAt: "2026-06-18", publishedAt: "2026-06-18T10:00:00+05:30" },
    ]

    expect([...posts].sort(compareBlogPublications).map((post) => post.slug)).toEqual([
      "later",
      "earlier",
    ])
  })

  test("breaks timestamp ties by slug", () => {
    const posts: BlogPublication[] = [
      { slug: "z-post", createdAt: "2026-06-18", publishedAt: "2026-06-18T09:00:00+05:30" },
      { slug: "a-post", createdAt: "2026-06-18", publishedAt: "2026-06-18T09:00:00+05:30" },
    ]

    expect([...posts].sort(compareBlogPublications).map((post) => post.slug)).toEqual([
      "a-post",
      "z-post",
    ])
  })
})
