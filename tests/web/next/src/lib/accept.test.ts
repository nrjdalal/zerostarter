import { describe, expect, test } from "bun:test"

import { parseAccept, preferredType, withVaryAccept } from "../../../../../web/next/src/lib/accept"

const PRODUCES = ["text/html", "text/markdown"] as const

describe("parseAccept", () => {
  test("reads type, q and specificity per entry, defaulting q to 1", () => {
    expect(parseAccept("text/markdown, text/html;q=0.8, */*;q=0.1")).toEqual([
      { q: 1, specificity: 2, type: "text/markdown" },
      { q: 0.8, specificity: 2, type: "text/html" },
      { q: 0.1, specificity: 0, type: "*/*" },
    ])
  })

  test("lowercases types, ranks subtype wildcards between exact and catch-all, and clamps q", () => {
    expect(parseAccept("Text/Markdown;q=2, text/*;q=-1")).toEqual([
      { q: 1, specificity: 2, type: "text/markdown" },
      { q: 0, specificity: 1, type: "text/*" },
    ])
  })

  test("ignores parameters that are not q and empty entries", () => {
    expect(parseAccept("text/markdown;charset=utf-8;q=0.5,,")).toEqual([
      { q: 0.5, specificity: 2, type: "text/markdown" },
    ])
  })
})

describe("preferredType", () => {
  test("a missing or empty Accept means no constraint, so the server default wins", () => {
    expect(preferredType(null, PRODUCES)).toBe("text/html")
    expect(preferredType("", PRODUCES)).toBe("text/html")
    expect(preferredType("*/*", PRODUCES)).toBe("text/html")
  })

  test("an agent asking for markdown gets markdown", () => {
    expect(preferredType("text/markdown", PRODUCES)).toBe("text/markdown")
    expect(preferredType("text/markdown, text/html;q=0.8", PRODUCES)).toBe("text/markdown")
  })

  test("a browser's Accept keeps HTML", () => {
    expect(
      preferredType(
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        PRODUCES,
      ),
    ).toBe("text/html")
  })

  test("higher q wins regardless of order", () => {
    expect(preferredType("text/html;q=0.5, text/markdown;q=0.9", PRODUCES)).toBe("text/markdown")
  })

  test("equal q falls back to client order, so a leading markdown wins a tie", () => {
    expect(preferredType("text/markdown, text/html, */*", PRODUCES)).toBe("text/markdown")
    expect(preferredType("text/html, text/markdown", PRODUCES)).toBe("text/html")
  })

  test("a specific range overrides a wildcard, so q=0 on html is a rejection even under */*", () => {
    expect(preferredType("text/html;q=0, */*", PRODUCES)).toBe("text/markdown")
  })

  test("text/* matches both and keeps the server's preference order", () => {
    expect(preferredType("text/*", PRODUCES)).toBe("text/html")
  })

  test("nothing acceptable is null, which the caller turns into a 406", () => {
    expect(preferredType("application/pdf", PRODUCES)).toBeNull()
    expect(preferredType("text/markdown;q=0, text/html;q=0", PRODUCES)).toBeNull()
    expect(preferredType("image/*", PRODUCES)).toBeNull()
  })
})

describe("withVaryAccept", () => {
  test("sets Vary when absent", () => {
    expect(withVaryAccept(new Headers()).get("Vary")).toBe("Accept")
  })

  test("appends to an existing Vary so a framework's tokens survive", () => {
    const headers = new Headers({ Vary: "RSC, Next-Router-State-Tree" })
    expect(withVaryAccept(headers).get("Vary")).toBe("RSC, Next-Router-State-Tree, Accept")
  })

  test("does not duplicate Accept, whatever its case, and respects a wildcard", () => {
    expect(withVaryAccept(new Headers({ Vary: "accept" })).get("Vary")).toBe("accept")
    expect(withVaryAccept(new Headers({ Vary: "*" })).get("Vary")).toBe("*")
  })
})
