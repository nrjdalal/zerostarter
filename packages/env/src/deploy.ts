import { getPublicSuffix } from "tldts"

// Build-only module: the single place tldts (the real Public Suffix List) may be imported. Consumed by tsdown.config.ts and next.config.ts to answer the one question only the PSL can, whether the api's parent domain is a browser-rejected public suffix, baked as COOKIE_DOMAIN / COOKIE_DOMAIN_PUBLIC_SUFFIX literals. The same-or-cross decision itself lives in @packages/auth/deploy and runs at boot from env; no file under any src/ may import this module (packages/env/test/isolation.test.ts pins that repo-wide), so no shipped bundle ever carries PSL code.

export type CookieDomainInfo = {
  readonly domain?: string
  readonly isPublicSuffix: boolean
}

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/

// The api's candidate cookie domain plus the PSL's verdict on it. The candidate mirrors the runtime getCookieDomain derivation exactly (environment-scoped parent, .localhost carve-out, localhost/IP/apex excluded), so the baked value and an unbaked runtime derivation can never disagree about the string; only the isPublicSuffix flag carries information the runtime cannot compute.
export function resolveCookieDomain(url: string): CookieDomainInfo {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return { isPublicSuffix: false }
  }
  if (hostname === "localhost" || IPV4.test(hostname) || hostname.startsWith("[")) {
    return { isPublicSuffix: false }
  }
  const parts = hostname.split(".")
  // Portless dev (*.localhost): shared across the base <name>.localhost, decided without the PSL so dev never depends on tldts.
  if (parts.at(-1) === "localhost") {
    return { domain: `.${parts.slice(-2).join(".")}`, isPublicSuffix: false }
  }
  if (parts.length <= 2) return { isPublicSuffix: false }
  const parent = parts.slice(1).join(".")
  const suffix = getPublicSuffix(parent, { allowPrivateDomains: true })
  // A null verdict (a hostname shape the PSL cannot judge) counts as a public suffix: better to hand off than to bake a Domain cookie browsers may reject.
  return { domain: `.${parent}`, isPublicSuffix: suffix === null || suffix === parent }
}
