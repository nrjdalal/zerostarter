import { describe, expect, test } from "bun:test"

import { getLLMText } from "../../../../../web/next/src/lib/llms"

const page = (processed: string) => ({
  url: "/docs/x",
  data: { title: "X", getText: async () => processed },
})
const bodyOf = async (processed: string) =>
  (await getLLMText(page(processed))).split("\n\n").slice(1).join("\n\n")

describe("getLLMText body", () => {
  test("decodes the hex references mdast writes for a character it escapes", async () => {
    expect(await bodyOf("&#x2A;*bold&#x2A;* and &#x20;lead")).toBe("**bold** and  lead")
    expect(await bodyOf("&#x1f600; &#X3C;b>")).toBe("\u{1F600} <b>")
  })

  test("decodes one level only, so an escaped reference stays a reference", async () => {
    expect(await bodyOf("&#x26;amp;")).toBe("&amp;")
  })

  test("leaves a named or decimal reference as written, since mdast never emits one", async () => {
    expect(await bodyOf("\\&amp; \\&copy; \\&#42;")).toBe("\\&amp; \\&copy; \\&#42;")
  })

  test("leaves a query string alone where a legacy name matches its start", async () => {
    expect(await bodyOf("`/og?title=Hello&description=World&section=Demo`")).toBe(
      "`/og?title=Hello&description=World&section=Demo`",
    )
  })

  test("leaves an out-of-range code point as written", async () => {
    expect(await bodyOf("&#x110000;")).toBe("&#x110000;")
  })
})
