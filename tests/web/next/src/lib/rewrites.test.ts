import { describe, expect, test } from "bun:test"

import {
  ACCEPTS_MARKDOWN,
  ACCEPTS_NEITHER,
  markdownRewrites,
  matchesHas,
  NOT_ACCEPTABLE_PATH,
} from "../../../../../web/next/src/lib/rewrites"

// The Accept headers acceptmarkdown.com/status records for agents that ask for markdown (2026-06-22).
const AGENTS = {
  "Claude Code": "text/markdown, text/html, */*",
  "Copilot Chat":
    "text/markdown, text/html;q=0.9, application/xhtml+xml;q=0.9, application/xml;q=0.8, */*;q=0.7",
  Cursor: "text/markdown, text/plain;q=0.9, */*;q=0.8",
  OpenClaw: "text/markdown, text/html;q=0.9, */*;q=0.1",
  OpenCode:
    "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1",
}
const BROWSER =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"

describe("ACCEPTS_MARKDOWN", () => {
  test("matches every agent that asks for markdown", () => {
    for (const [agent, accept] of Object.entries(AGENTS)) {
      expect(matchesHas(ACCEPTS_MARKDOWN, accept), agent).toBe(true)
    }
  })

  test("leaves browsers, wildcards and Next's own fetches alone", () => {
    expect(matchesHas(ACCEPTS_MARKDOWN, BROWSER)).toBe(false)
    expect(matchesHas(ACCEPTS_MARKDOWN, "*/*")).toBe(false)
    expect(matchesHas(ACCEPTS_MARKDOWN, "text/x-component")).toBe(false)
  })

  test("treats an explicit q=0 on markdown as a rejection, at any position", () => {
    expect(matchesHas(ACCEPTS_MARKDOWN, "text/markdown;q=0, text/html")).toBe(false)
    expect(matchesHas(ACCEPTS_MARKDOWN, "text/html, text/markdown;q=0")).toBe(false)
    expect(matchesHas(ACCEPTS_MARKDOWN, "text/html, text/markdown; q=0.0")).toBe(false)
    expect(matchesHas(ACCEPTS_MARKDOWN, "text/html;q=0.8, text/markdown;q=0.9")).toBe(true)
  })
})

describe("ACCEPTS_NEITHER", () => {
  test("matches a client that accepts none of the representations", () => {
    expect(matchesHas(ACCEPTS_NEITHER, "application/pdf")).toBe(true)
    expect(matchesHas(ACCEPTS_NEITHER, "application/json, text/plain")).toBe(true)
  })

  test("does not match when html, markdown or a wildcard is acceptable", () => {
    expect(matchesHas(ACCEPTS_NEITHER, BROWSER)).toBe(false)
    expect(matchesHas(ACCEPTS_NEITHER, "*/*")).toBe(false)
    expect(matchesHas(ACCEPTS_NEITHER, "text/*")).toBe(false)
    expect(matchesHas(ACCEPTS_NEITHER, "application/json, */*;q=0.1")).toBe(false)
    for (const accept of Object.values(AGENTS))
      expect(matchesHas(ACCEPTS_NEITHER, accept)).toBe(false)
  })

  test("never matches an absent header, which Next treats as no constraint", () => {
    expect(matchesHas(ACCEPTS_NEITHER, "")).toBe(false)
  })
})

describe("markdownRewrites", () => {
  test("pairs every page with a markdown sibling with its llms.txt route and the 406 fallback", () => {
    const rules = markdownRewrites()
    const bySource = (source: string) => rules.filter((rule) => rule.source === source)
    expect(bySource("/").map((rule) => rule.destination)).toEqual([
      "/llms.txt",
      NOT_ACCEPTABLE_PATH,
    ])
    expect(bySource("/docs/:path*").map((rule) => rule.destination)).toEqual([
      "/llms.txt/docs/:path*",
      NOT_ACCEPTABLE_PATH,
    ])
    expect(bySource("/blog/:path*").map((rule) => rule.destination)).toEqual([
      "/llms.txt/blog/:path*",
      NOT_ACCEPTABLE_PATH,
    ])
    expect(rules).toHaveLength(6)
  })

  test("every rule conditions on the Accept header and skips RSC fetches", () => {
    for (const rule of markdownRewrites()) {
      expect(rule.has).toEqual([{ key: "accept", type: "header", value: expect.any(String) }])
      expect(rule.missing).toEqual([{ key: "rsc", type: "header" }])
    }
  })
})
