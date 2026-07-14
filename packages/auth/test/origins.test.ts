import { describe, expect, test } from "bun:test"

import { baseDomainOf, buildTrustedOrigins, isTrustedOrigin } from "@/lib/origins"

describe("baseDomainOf", () => {
  test.each([
    ["https://zerostarter.dev", "zerostarter.dev"],
    ["https://api.zerostarter.dev", "zerostarter.dev"],
    ["https://feat.api.zerostarter.dev", "zerostarter.dev"],
    ["http://api.zerostarter.localhost:1355", "zerostarter.localhost"],
    ["http://localhost:4000", undefined],
    ["http://127.0.0.1:4000", undefined],
    ["not a url", undefined],
  ])("%s -> %s", (url, expected) => {
    expect(baseDomainOf(url)).toBe(expected as string | undefined)
  })
})

describe("isTrustedOrigin", () => {
  const allowlist = ["https://zerostarter.dev"]

  test("exact allowlist match is always trusted", () => {
    expect(isTrustedOrigin("https://zerostarter.dev", allowlist, { allowWildcard: false })).toBe(
      true,
    )
  })

  test("trailing slash is normalized", () => {
    expect(isTrustedOrigin("https://zerostarter.dev/", allowlist, { allowWildcard: false })).toBe(
      true,
    )
  })

  test("non-prod wildcard trusts subdomains at any depth", () => {
    const opts = { baseDomain: "zerostarter.dev", allowWildcard: true }
    expect(isTrustedOrigin("https://feat.zerostarter.dev", allowlist, opts)).toBe(true)
    expect(isTrustedOrigin("https://feat.api.zerostarter.dev", allowlist, opts)).toBe(true)
  })

  test("production is a strict allowlist (no wildcard)", () => {
    const opts = { baseDomain: "zerostarter.dev", allowWildcard: false }
    expect(isTrustedOrigin("https://feat.zerostarter.dev", allowlist, opts)).toBe(false)
  })

  test("a foreign domain is never trusted, even under wildcard", () => {
    expect(
      isTrustedOrigin("https://evil.com", allowlist, {
        baseDomain: "zerostarter.dev",
        allowWildcard: true,
      }),
    ).toBe(false)
  })

  test("empty or missing origin is not trusted", () => {
    const opts = { baseDomain: "zerostarter.dev", allowWildcard: true }
    expect(isTrustedOrigin("", allowlist, opts)).toBe(false)
    expect(isTrustedOrigin(undefined, allowlist, opts)).toBe(false)
  })
})

describe("buildTrustedOrigins", () => {
  test("production returns the strict allowlist unchanged", () => {
    expect(
      buildTrustedOrigins(["https://zerostarter.dev"], {
        baseDomain: "zerostarter.dev",
        allowWildcard: false,
      }),
    ).toEqual(["https://zerostarter.dev"])
  })

  test("non-prod appends both-scheme wildcard patterns", () => {
    expect(
      buildTrustedOrigins(["https://zerostarter.dev"], {
        baseDomain: "zerostarter.dev",
        allowWildcard: true,
      }),
    ).toEqual(["https://zerostarter.dev", "https://*.zerostarter.dev", "http://*.zerostarter.dev"])
  })

  test("no base domain (localhost) returns the allowlist unchanged", () => {
    expect(buildTrustedOrigins(["http://localhost:3000"], { allowWildcard: true })).toEqual([
      "http://localhost:3000",
    ])
  })
})
