import { expect, test } from "bun:test"

import { getCookieDomain, getCookiePrefix } from "@/lib/utils"

test("getCookieDomain scopes the cookie to the environment subdomain in production", () => {
  expect(getCookieDomain("https://api.example.com")).toBe(".example.com")
  expect(getCookieDomain("https://api.canary.example.com")).toBe(".canary.example.com")
  expect(getCookieDomain("https://api.dev.example.com")).toBe(".dev.example.com")
})

test("getCookieDomain returns undefined for bare localhost / IP / apex", () => {
  expect(getCookieDomain("http://localhost:4000")).toBeUndefined()
  expect(getCookieDomain("http://127.0.0.1:4000")).toBeUndefined()
  expect(getCookieDomain("https://example.com")).toBeUndefined()
  expect(getCookieDomain("not a url")).toBeUndefined()
})

test("getCookieDomain shares the cookie across web + api under portless (.localhost)", () => {
  // Main checkout: web zerostarter.localhost, api api.zerostarter.localhost.
  expect(getCookieDomain("http://zerostarter.localhost:1355")).toBe(".zerostarter.localhost")
  expect(getCookieDomain("http://api.zerostarter.localhost:1355")).toBe(".zerostarter.localhost")
  // Worktree (branch-prefixed): web feat.zerostarter.localhost, api feat.api.zerostarter.localhost.
  expect(getCookieDomain("http://feat.zerostarter.localhost:1355")).toBe(".zerostarter.localhost")
  expect(getCookieDomain("http://feat.api.zerostarter.localhost:1355")).toBe(
    ".zerostarter.localhost",
  )
})

test("getCookiePrefix isolates by environment subdomain in production", () => {
  expect(getCookiePrefix("https://api.example.com")).toBeUndefined()
  expect(getCookiePrefix("https://api.canary.example.com")).toBe("canary")
  expect(getCookiePrefix("https://api.dev.example.com")).toBe("dev")
})

test("getCookiePrefix returns no prefix for local dev (.localhost) so web + api match", () => {
  expect(getCookiePrefix("http://localhost:4000")).toBeUndefined()
  expect(getCookiePrefix("http://api.zerostarter.localhost:1355")).toBeUndefined()
  expect(getCookiePrefix("http://feat.api.zerostarter.localhost:1355")).toBeUndefined()
  expect(getCookiePrefix("http://feat.zerostarter.localhost:1355")).toBeUndefined()
})
