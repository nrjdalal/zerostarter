import { describe, expect, test } from "bun:test"

import { llmTextHeaders, markdownNotFound } from "../../../../../web/next/src/lib/markdown"

describe("llmTextHeaders", () => {
  test("every markdown response is typed as markdown and varies on Accept", () => {
    expect(llmTextHeaders["Content-Type"]).toBe("text/markdown; charset=utf-8")
    expect(llmTextHeaders.Vary).toBe("Accept")
  })
})

describe("markdownNotFound", () => {
  test("is a real 404 with a markdown body", async () => {
    const response = markdownNotFound("https://example.com")
    expect(response.status).toBe(404)
    expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8")
    expect(response.headers.get("Vary")).toBe("Accept")
    const body = await response.text()
    expect(body.startsWith("# Not found")).toBe(true)
  })

  test("points at the places an agent can recover from, on the given origin", async () => {
    const body = await markdownNotFound("https://example.com").text()
    expect(body).toContain("https://example.com/llms.txt")
    expect(body).toContain("https://example.com/llms-full.txt")
    expect(body).toContain("https://example.com/sitemap.xml")
  })
})
