import { expect, test } from "bun:test"

import { HANDOFF_TOKEN_PATTERN, mintHandoffToken } from "@packages/config/deploy"

test("mintHandoffToken emits a 64-char lowercase-hex token matching HANDOFF_TOKEN_PATTERN", () => {
  for (let i = 0; i < 100; i++) {
    const t = mintHandoffToken()
    expect(t).toMatch(HANDOFF_TOKEN_PATTERN)
    expect(t).toHaveLength(64)
  }
  // The pattern rejects the wrong charset, length, or case, so a malformed id/nonce is refused before any lookup.
  expect(HANDOFF_TOKEN_PATTERN.test("g".repeat(64))).toBe(false)
  expect(HANDOFF_TOKEN_PATTERN.test("a".repeat(63))).toBe(false)
  expect(HANDOFF_TOKEN_PATTERN.test("A".repeat(64))).toBe(false)
})

test("mintHandoffToken does not repeat across many mints", () => {
  const seen = new Set<string>()
  for (let i = 0; i < 1000; i++) seen.add(mintHandoffToken())
  expect(seen.size).toBe(1000)
})
