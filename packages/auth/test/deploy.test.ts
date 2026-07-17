import { expect, test } from "bun:test"

import { resolveDeployMode } from "@/deploy"

// The same-or-cross truth table. The Public Suffix List verdict arrives pre-computed (baked at build); rows pass it explicitly the way the api's boot does.
const psl = (domain: string | undefined, isPublicSuffix = false) => ({ domain, isPublicSuffix })

test("resolveDeployMode resolves shared when a usable parent domain covers a web origin", () => {
  // The classic cross-subdomain setup, byte-identical to the pre-split template.
  expect(
    resolveDeployMode(psl(".example.com"), "https://api.example.com", ["https://app.example.com"]),
  ).toEqual({ kind: "shared", cookieDomain: ".example.com" })
  // Environment-scoped (#715): api.canary.example.com shares with its own env only.
  expect(
    resolveDeployMode(psl(".canary.example.com"), "https://api.canary.example.com", [
      "https://app.canary.example.com",
    ]),
  ).toEqual({ kind: "shared", cookieDomain: ".canary.example.com" })
  // Any covered origin qualifies, position-independent; extra CORS-only origins do not flip the mode.
  expect(
    resolveDeployMode(psl(".example.com"), "https://api.example.com", [
      "https://partner.vercel.app",
      "https://app.example.com",
    ]),
  ).toEqual({ kind: "shared", cookieDomain: ".example.com" })
  // Portless dev: web and api subdomains share the base .localhost domain.
  expect(
    resolveDeployMode(psl(".zerostarter.localhost"), "http://api.zerostarter.localhost", [
      "http://zerostarter.localhost",
    ]),
  ).toEqual({ kind: "shared", cookieDomain: ".zerostarter.localhost" })
  // The bare parent itself counts as covered.
  expect(
    resolveDeployMode(psl(".example.com"), "https://api.example.com", ["https://example.com"]),
  ).toEqual({ kind: "shared", cookieDomain: ".example.com" })
})

test("resolveDeployMode resolves split whenever web and api cannot share a cookie (wide trigger)", () => {
  // Two sibling projects on a public suffix: the baked verdict vetoes the domain.
  expect(
    resolveDeployMode(psl(".vercel.app", true), "https://myapp-api.vercel.app", [
      "https://myapp-web.vercel.app",
    ]),
  ).toEqual({ kind: "split", webOrigin: "https://myapp-web.vercel.app" })
  // Two unrelated custom domains: a usable domain that covers nothing.
  expect(
    resolveDeployMode(psl(".acme.com"), "https://api.acme.com", ["https://app.beta.io"]),
  ).toEqual({ kind: "split", webOrigin: "https://app.beta.io" })
  // Web outside the api's environment scope: cookies are deliberately env-scoped (#715), so hand off instead of leaking wider.
  expect(
    resolveDeployMode(psl(".dev.example.com"), "https://api.dev.example.com", [
      "https://app.example.com",
    ]),
  ).toEqual({ kind: "split", webOrigin: "https://app.example.com" })
  // Apex api has no parent to scope a cookie to; the handoff makes this shape work at all.
  expect(
    resolveDeployMode(psl(undefined), "https://example.com", ["https://app.example.com"]),
  ).toEqual({ kind: "split", webOrigin: "https://app.example.com" })
})

test("resolveDeployMode picks the first trusted origin on a different host, not the first entry", () => {
  expect(
    resolveDeployMode(psl(".vercel.app", true), "https://myapp-api.vercel.app", [
      "https://myapp-api.vercel.app",
      "https://myapp-web.vercel.app",
    ]),
  ).toEqual({ kind: "split", webOrigin: "https://myapp-web.vercel.app" })
})

test("resolveDeployMode resolves host-only when no distinct web origin exists", () => {
  // Plain-localhost dev: one host, two ports; host-only cookies already span ports.
  expect(
    resolveDeployMode(psl(undefined), "http://localhost:4000", ["http://localhost:3000"]),
  ).toEqual({ kind: "host-only" })
  // Same hostname on different ports is one site; splitting it would trade working host-only cookies for rejected SameSite=None ones.
  expect(resolveDeployMode(psl(undefined), "http://myhost:4000", ["http://myhost:3000"])).toEqual({
    kind: "host-only",
  })
  // Same origin on a public suffix: one site, nothing to hand off.
  expect(
    resolveDeployMode(psl(".vercel.app", true), "https://myapp.vercel.app", [
      "https://myapp.vercel.app",
    ]),
  ).toEqual({ kind: "host-only" })
  // An api-only deploy stays host-only rather than minting a Domain cookie nobody consumes; a consumer under the parent belongs in HONO_TRUSTED_ORIGINS, which flips this to shared.
  expect(resolveDeployMode(psl(".example.com"), "https://api.example.com", [])).toEqual({
    kind: "host-only",
  })
  // Malformed input never throws.
  expect(resolveDeployMode(psl(undefined), "not a url", ["https://app.example.com"])).toEqual({
    kind: "host-only",
  })
  expect(resolveDeployMode(psl(".example.com"), "https://api.example.com", ["not a url"])).toEqual({
    kind: "host-only",
  })
})

test("resolveDeployMode unbaked (running from source) never resolves split into a shared-looking pair", () => {
  // From source the PSL veto is unavailable (isPublicSuffix defaults false), so a naive .vercel.app domain resolves shared, the pre-split behavior; shipped artifacts always carry the baked verdict.
  expect(
    resolveDeployMode(psl(".vercel.app", false), "https://myapp-api.vercel.app", [
      "https://myapp-web.vercel.app",
    ]),
  ).toEqual({ kind: "shared", cookieDomain: ".vercel.app" })
})
