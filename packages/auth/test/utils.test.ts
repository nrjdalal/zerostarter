import { expect, test } from "bun:test"

import { getCookieDomain, getCookiePrefix, resolveDeployMode } from "@/lib/utils"

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

test("getCookieDomain stays host-only on public hosting suffixes", () => {
  for (const host of [
    "https://myapp.deno.dev",
    "https://myapp.firebaseapp.com",
    "https://myapp.fly.dev",
    "https://me.github.io",
    "https://myapp.herokuapp.com",
    "https://myapp.netlify.app",
    "https://myapp.onrender.com",
    "https://myapp.pages.dev",
    "https://myapp-api.vercel.app",
    "https://myapp.web.app",
  ]) {
    expect(getCookieDomain(host)).toBeUndefined()
  }
})

test("resolveDeployMode resolves shared-domain for custom domains and portless", () => {
  expect(resolveDeployMode("https://api.example.com", ["https://app.example.com"])).toEqual({
    kind: "shared-domain",
    cookieDomain: ".example.com",
  })
  expect(
    resolveDeployMode("http://api.zerostarter.localhost", ["http://zerostarter.localhost"]),
  ).toEqual({ kind: "shared-domain", cookieDomain: ".zerostarter.localhost" })
})

test("resolveDeployMode resolves split for two projects on a public suffix", () => {
  expect(
    resolveDeployMode("https://myapp-api.vercel.app", ["https://myapp-web.vercel.app"]),
  ).toEqual({ kind: "split", webOrigin: "https://myapp-web.vercel.app" })
  expect(
    resolveDeployMode("https://myapp-api.netlify.app", ["https://myapp-web.netlify.app"]),
  ).toEqual({ kind: "split", webOrigin: "https://myapp-web.netlify.app" })
})

test("resolveDeployMode finds the web origin regardless of trusted-origin order", () => {
  // Operator lists the api origin first: the web origin is resolved by differing from the api, not by position.
  expect(
    resolveDeployMode("https://myapp-api.vercel.app", [
      "https://myapp-api.vercel.app",
      "https://myapp-web.vercel.app",
    ]),
  ).toEqual({ kind: "split", webOrigin: "https://myapp-web.vercel.app" })
})

test("resolveDeployMode resolves host-only for same-origin suffix, bare hosts, no trusted origins", () => {
  expect(resolveDeployMode("https://myapp.vercel.app", ["https://myapp.vercel.app"])).toEqual({
    kind: "host-only",
  })
  expect(resolveDeployMode("http://localhost:4000", ["http://localhost:3000"])).toEqual({
    kind: "host-only",
  })
  expect(resolveDeployMode("https://myapp-api.vercel.app", [])).toEqual({ kind: "host-only" })
})
