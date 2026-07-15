import { describe, expect, test } from "bun:test"

import { getCookieDomain, resolveDeployMode } from "./utils"

describe("getCookieDomain", () => {
  test("custom domains share the parent", () => {
    expect(getCookieDomain("https://api.example.com")).toBe(".example.com")
    expect(getCookieDomain("https://api.canary.example.com")).toBe(".canary.example.com")
  })
  test("portless localhost shares the app base", () => {
    expect(getCookieDomain("http://api.zerostarter.localhost")).toBe(".zerostarter.localhost")
    expect(getCookieDomain("http://feat.api.zerostarter.localhost")).toBe(".zerostarter.localhost")
  })
  test("bare hosts stay host-only", () => {
    expect(getCookieDomain("http://localhost:4000")).toBeUndefined()
    expect(getCookieDomain("https://example.com")).toBeUndefined()
  })
  test("public hosting suffixes stay host-only", () => {
    for (const host of [
      "https://myapp-api.vercel.app",
      "https://myapp.netlify.app",
      "https://myapp.pages.dev",
      "https://me.github.io",
      "https://myapp.fly.dev",
    ]) {
      expect(getCookieDomain(host)).toBeUndefined()
    }
  })
})

describe("resolveDeployMode", () => {
  test("custom domain pair resolves shared-domain, byte-identical config path", () => {
    expect(resolveDeployMode("https://api.example.com", ["https://app.example.com"])).toEqual({
      kind: "shared-domain",
      cookieDomain: ".example.com",
    })
  })
  test("portless localhost resolves shared-domain", () => {
    expect(
      resolveDeployMode("http://api.zerostarter.localhost", ["http://zerostarter.localhost"]),
    ).toEqual({ kind: "shared-domain", cookieDomain: ".zerostarter.localhost" })
  })
  test("two public-suffix projects resolve split", () => {
    expect(
      resolveDeployMode("https://myapp-api.vercel.app", ["https://myapp-web.vercel.app"]),
    ).toEqual({ kind: "split", webOrigin: "https://myapp-web.vercel.app" })
  })
  test("suffix host with the same origin is not split", () => {
    expect(resolveDeployMode("https://myapp.vercel.app", ["https://myapp.vercel.app"])).toEqual({
      kind: "host-only",
    })
  })
  test("bare localhost resolves host-only", () => {
    expect(resolveDeployMode("http://localhost:4000", ["http://localhost:3000"])).toEqual({
      kind: "host-only",
    })
  })
  test("no trusted origins on a suffix host resolves host-only", () => {
    expect(resolveDeployMode("https://myapp-api.vercel.app", [])).toEqual({ kind: "host-only" })
  })
})
