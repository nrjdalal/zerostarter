import { describe, expect, test } from "bun:test"

import { Client, enabled, WEB } from "../../../../../../../stack"

// The blog in web/next/src/app/(content)/blog/[[...slug]]/page.tsx on a running stack: the index renders, the first post it links renders, an unknown slug is not found. The post is found through the index rather than named, so a fork with its own posts passes unchanged.

describe.skipIf(!enabled)("web/next/src/app/(content)/blog/[[...slug]]/page.tsx", () => {
  const visitor = new Client(WEB)

  test("the blog index and the first post it links render", async () => {
    const index = await visitor.fetch("/blog")
    expect(index.status).toBe(200)
    const html = await index.text()
    const link = html.match(/href="(\/blog\/[^"/]+)"/)
    expect(link, "the index links at least one post").not.toBeNull()
    const post = await visitor.fetch(link ? link[1] : "/blog/missing")
    expect(post.status).toBe(200)
    expect(post.headers.get("content-type")).toContain("text/html")
  })

  test("an unknown post is not found", async () => {
    const response = await visitor.fetch("/blog/nothing-here")
    expect(response.status).toBe(404)
  })
})
