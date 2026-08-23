import { describe, expect, test } from "bun:test"

import { markdownPathFor, negotiateMarkdown } from "../../../../../web/next/src/lib/negotiate"

const get = (
  pathname: string,
  accept: string | null,
  extra?: { method?: string; nextInternal?: boolean },
) =>
  negotiateMarkdown({
    accept,
    method: extra?.method ?? "GET",
    nextInternal: extra?.nextInternal ?? false,
    pathname,
  })

describe("markdownPathFor", () => {
  test("maps the pages that have a markdown sibling onto the llms.txt routes", () => {
    expect(markdownPathFor("/")).toBe("/llms.txt")
    expect(markdownPathFor("/docs")).toBe("/llms.txt/docs")
    expect(markdownPathFor("/docs/getting-started/setup")).toBe(
      "/llms.txt/docs/getting-started/setup",
    )
    expect(markdownPathFor("/blog")).toBe("/llms.txt/blog")
    expect(markdownPathFor("/blog/hello")).toBe("/llms.txt/blog/hello")
  })

  test("is null for pages with no markdown, including lookalike prefixes", () => {
    expect(markdownPathFor("/hire")).toBeNull()
    expect(markdownPathFor("/docsy")).toBeNull()
    expect(markdownPathFor("/dashboard")).toBeNull()
  })
})

describe("negotiateMarkdown", () => {
  test("a markdown request is rewritten to the page's markdown sibling", () => {
    expect(get("/docs/getting-started/setup", "text/markdown")).toEqual({
      kind: "markdown",
      path: "/llms.txt/docs/getting-started/setup",
    })
    expect(get("/", "text/markdown, text/html;q=0.8")).toEqual({
      kind: "markdown",
      path: "/llms.txt",
    })
  })

  test("an HTML request, or none at all, stays HTML and varies on Accept", () => {
    expect(get("/docs", "text/html,*/*;q=0.8")).toEqual({ kind: "html", vary: true })
    expect(get("/blog", null)).toEqual({ kind: "html", vary: true })
    expect(get("/blog", "*/*")).toEqual({ kind: "html", vary: true })
  })

  test("a client that accepts neither representation is told what exists", () => {
    expect(get("/docs", "application/pdf")).toEqual({
      kind: "not-acceptable",
      requested: "application/pdf",
    })
    expect(get("/", "text/html;q=0, text/markdown;q=0")).toEqual({
      kind: "not-acceptable",
      requested: "text/html;q=0, text/markdown;q=0",
    })
  })

  test("never negotiates Next's own traffic or non-document methods", () => {
    expect(get("/docs", "text/x-component", { nextInternal: true })).toEqual({ kind: "skip" })
    expect(get("/docs", "text/markdown", { method: "POST" })).toEqual({ kind: "skip" })
    expect(get("/", "application/pdf", { method: "POST" })).toEqual({ kind: "skip" })
  })

  test("an explicit .md or .txt URL keeps going to the rewrite, with Vary set", () => {
    expect(get("/docs/setup.md", "text/markdown")).toEqual({ kind: "html", vary: true })
    expect(get("/blog/post.txt", null)).toEqual({ kind: "html", vary: true })
  })

  test("pages without a markdown sibling are left alone, even for a markdown-only client", () => {
    expect(get("/hire", "text/markdown")).toEqual({ kind: "skip" })
    expect(get("/hire", "application/pdf")).toEqual({ kind: "skip" })
  })
})
