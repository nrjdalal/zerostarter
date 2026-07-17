import { expect, test } from "bun:test"

import { resolveCookieDomain } from "@/deploy"
import { DEPLOY_MODES } from "@/lib/deploy-modes"

test("DEPLOY_MODES is the canonical kind list, A to Z", () => {
  expect(DEPLOY_MODES).toEqual(["host-only", "shared", "split"])
})

test("resolveCookieDomain derives the environment-scoped parent, exactly like the runtime derivation", () => {
  // The classic cross-subdomain setup: parent domain, PSL-approved.
  expect(resolveCookieDomain("https://api.example.com")).toEqual({
    domain: ".example.com",
    isPublicSuffix: false,
  })
  // Environment-scoped, not registrable-scoped: api.canary.example.com stays with its own env (#715 cookie isolation).
  expect(resolveCookieDomain("https://api.canary.example.com")).toEqual({
    domain: ".canary.example.com",
    isPublicSuffix: false,
  })
  // A deep subdomain under a hosting suffix has a registrable parent, so a Domain cookie there works.
  expect(resolveCookieDomain("https://api.team.vercel.app")).toEqual({
    domain: ".team.vercel.app",
    isPublicSuffix: false,
  })
  // A real PSL knows ccTLD second levels the old curated set never could.
  expect(resolveCookieDomain("https://api.foo.co.uk")).toEqual({
    domain: ".foo.co.uk",
    isPublicSuffix: false,
  })
  // Unknown internal TLDs still share (tldts treats the last label as the suffix).
  expect(resolveCookieDomain("http://api.corp.intranet")).toEqual({
    domain: ".corp.intranet",
    isPublicSuffix: false,
  })
})

test("resolveCookieDomain flags a public-suffix parent, the one fact a runtime cannot compute", () => {
  // Two sibling projects on a hosting suffix: browsers reject Domain=.vercel.app, so sign-in must cross origins. Covers every suffix the old curated set enumerated, and all the ones it missed.
  for (const suffix of [
    "deno.dev",
    "fly.dev",
    "github.io",
    "netlify.app",
    "onrender.com",
    "pages.dev",
    "up.railway.app",
    "vercel.app",
    "web.app",
    "workers.dev",
  ]) {
    expect(resolveCookieDomain(`https://myapp-api.${suffix}`)).toEqual({
      domain: `.${suffix}`,
      isPublicSuffix: true,
    })
  }
})

test("resolveCookieDomain short-circuits portless .localhost without the PSL", () => {
  expect(resolveCookieDomain("http://api.zerostarter.localhost")).toEqual({
    domain: ".zerostarter.localhost",
    isPublicSuffix: false,
  })
  // Branch-prefixed worktree hosts share the same base domain (runtime getCookieDomain parity).
  expect(resolveCookieDomain("http://feat.api.zerostarter.localhost:1355")).toEqual({
    domain: ".zerostarter.localhost",
    isPublicSuffix: false,
  })
})

test("resolveCookieDomain yields no domain for dev hosts, IPs, apexes, and malformed input", () => {
  for (const url of [
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "http://192.168.1.100:4000",
    "http://[::1]:4000",
    "http://myhost:4000",
    "https://example.com",
    "https://polyfill.url",
    "not a url",
  ]) {
    expect(resolveCookieDomain(url)).toEqual({ isPublicSuffix: false })
  }
})
