import { expect, test } from "bun:test"

import {
  HANDOFF_TOKEN_PATTERN,
  isPublicHostingSuffix,
  isSplitPair,
  mintHandoffToken,
} from "@packages/config/deploy"

test("isPublicHostingSuffix is true only for a host directly under a known apex", () => {
  expect(isPublicHostingSuffix("myapp-api.vercel.app")).toBe(true)
  expect(isPublicHostingSuffix("me.github.io")).toBe(true)
  expect(isPublicHostingSuffix("myapp.netlify.app")).toBe(true)
  // The apex itself is not a host under it, and an unknown parent is not curated.
  expect(isPublicHostingSuffix("vercel.app")).toBe(false)
  expect(isPublicHostingSuffix("api.example.com")).toBe(false)
  // A deeper subdomain's shareable parent is a registrable domain, not the apex, so a Domain cookie there works and it is not treated as public-suffix hosting.
  expect(isPublicHostingSuffix("api.team.vercel.app")).toBe(false)
})

test("isSplitPair is true only for two distinct sites on a public suffix", () => {
  expect(isSplitPair("https://myapp-web.vercel.app", "https://myapp-api.vercel.app")).toBe(true)
  expect(isSplitPair("https://myapp-web.netlify.app", "https://myapp-api.netlify.app")).toBe(true)
  // Same origin: one site, nothing to hand off.
  expect(isSplitPair("https://myapp.vercel.app", "https://myapp.vercel.app")).toBe(false)
  // Custom-domain api: a shareable parent exists, so shared-domain, not split.
  expect(isSplitPair("https://app.example.com", "https://api.example.com")).toBe(false)
  // Malformed input never throws, just returns false.
  expect(isSplitPair("not a url", "also not")).toBe(false)
})

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
