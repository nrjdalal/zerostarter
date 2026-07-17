import { expect, test } from "bun:test"

import { cookieConfig, type ParsedHost } from "@/lib/utils"

// A real tldts parse result (allowPrivateDomains), narrowed to the fields cookieConfig reads.
const host = (h: Partial<ParsedHost>): ParsedHost => ({
  domain: null,
  isIp: false,
  isPrivate: false,
  publicSuffix: null,
  subdomain: null,
  ...h,
})

test("cookieConfig scopes the cookie to the environment subdomain in production", () => {
  expect(
    cookieConfig(host({ subdomain: "api", domain: "example.com", publicSuffix: "com" })),
  ).toEqual({
    cookieDomain: ".example.com",
    cookiePrefix: undefined,
    isPrivate: false,
  })
  expect(
    cookieConfig(host({ subdomain: "api.canary", domain: "example.com", publicSuffix: "com" })),
  ).toEqual({ cookieDomain: ".canary.example.com", cookiePrefix: "canary", isPrivate: false })
  expect(
    cookieConfig(host({ subdomain: "api.dev", domain: "example.com", publicSuffix: "com" })),
  ).toEqual({ cookieDomain: ".dev.example.com", cookiePrefix: "dev", isPrivate: false })
})

test("cookieConfig is host-only for an apex, a bare host, an IP, and the null-host fallback", () => {
  expect(cookieConfig(host({ subdomain: "", domain: "example.com", publicSuffix: "com" }))).toEqual(
    {
      cookieDomain: undefined,
      cookiePrefix: undefined,
      isPrivate: false,
    },
  )
  // Bare localhost: tldts leaves domain null.
  expect(cookieConfig(host({ publicSuffix: "localhost" }))).toEqual({
    cookieDomain: undefined,
    cookiePrefix: undefined,
    isPrivate: false,
  })
  // IP: tldts passes isPrivate through as null.
  expect(cookieConfig(host({ isIp: true, isPrivate: null }))).toEqual({
    cookieDomain: undefined,
    cookiePrefix: undefined,
    isPrivate: null,
  })
  // The build config's null-host fallback (a bare tsdown run without the generate step).
  expect(cookieConfig(host({ isPrivate: null }))).toEqual({
    cookieDomain: undefined,
    cookiePrefix: undefined,
    isPrivate: null,
  })
})

test("cookieConfig shares the cookie across web + api under portless (.localhost)", () => {
  for (const subdomain of ["", "api", "feat.api"]) {
    expect(
      cookieConfig(host({ subdomain, domain: "zerostarter.localhost", publicSuffix: "localhost" })),
    ).toEqual({ cookieDomain: ".zerostarter.localhost", cookiePrefix: undefined, isPrivate: false })
  }
})

test("cookieConfig treats a multi-level public suffix as an apex, not a shareable parent", () => {
  expect(
    cookieConfig(host({ subdomain: "", domain: "example.co.uk", publicSuffix: "co.uk" })),
  ).toEqual({
    cookieDomain: undefined,
    cookiePrefix: undefined,
    isPrivate: false,
  })
  expect(
    cookieConfig(host({ subdomain: "api", domain: "example.co.uk", publicSuffix: "co.uk" })),
  ).toEqual({ cookieDomain: ".example.co.uk", cookiePrefix: undefined, isPrivate: false })
  // "example" is the registrable name on a ccTLD, not an environment prefix.
  expect(
    cookieConfig(host({ subdomain: "api.canary", domain: "example.co.uk", publicSuffix: "co.uk" })),
  ).toEqual({ cookieDomain: ".canary.example.co.uk", cookiePrefix: "canary", isPrivate: false })
})

test("cookieConfig passes isPrivate through for a public hosting suffix and stays host-only", () => {
  expect(
    cookieConfig(
      host({
        subdomain: "",
        domain: "myapp-api.vercel.app",
        isPrivate: true,
        publicSuffix: "vercel.app",
      }),
    ),
  ).toEqual({ cookieDomain: undefined, cookiePrefix: undefined, isPrivate: true })
  expect(
    cookieConfig(
      host({
        subdomain: "",
        domain: "myapp.pages.dev",
        isPrivate: true,
        publicSuffix: "pages.dev",
      }),
    ),
  ).toEqual({ cookieDomain: undefined, cookiePrefix: undefined, isPrivate: true })
  expect(
    cookieConfig(
      host({
        subdomain: "",
        domain: "myuser.github.io",
        isPrivate: true,
        publicSuffix: "github.io",
      }),
    ),
  ).toEqual({ cookieDomain: undefined, cookiePrefix: undefined, isPrivate: true })
})

test("cookieConfig still computes a domain under a private suffix with a subdomain; isPrivate wins in index.ts", () => {
  // Unreachable on Vercel/Pages in practice; documents that index.ts's isPrivate branch overrides the computed cross-subdomain domain rather than sharing it.
  expect(
    cookieConfig(
      host({
        subdomain: "api",
        domain: "myapp.vercel.app",
        isPrivate: true,
        publicSuffix: "vercel.app",
      }),
    ),
  ).toEqual({ cookieDomain: ".myapp.vercel.app", cookiePrefix: undefined, isPrivate: true })
})
