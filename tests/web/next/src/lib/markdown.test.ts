import { describe, expect, test } from "bun:test"

import {
  llmTextHeaders,
  markdownNotFound,
  notAcceptable,
} from "../../../../../web/next/src/lib/markdown"

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

describe("notAcceptable", () => {
  test("is a 406 that lists both representations and echoes what was asked for", async () => {
    const response = notAcceptable("application/pdf")
    expect(response.status).toBe(406)
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8")
    expect(response.headers.get("Vary")).toBe("Accept")
    const body = await response.text()
    expect(body).toContain("text/html")
    expect(body).toContain("text/markdown")
    expect(body).toContain("application/pdf")
  })
})
