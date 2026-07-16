import { isPublicHostingSuffix, isSplitPair } from "@packages/config/deploy"

/**
 * Extracts the cookie domain from a URL for cross-subdomain cookie sharing.
 *
 * @example
 * getCookieDomain("https://api.example.com")             // ".example.com"
 * getCookieDomain("https://api.canary.example.com")      // ".canary.example.com"
 * getCookieDomain("https://api.dev.example.com")         // ".dev.example.com"
 * getCookieDomain("http://api.zerostarter.localhost")    // ".zerostarter.localhost" (portless dev)
 * getCookieDomain("http://feat.api.zerostarter.localhost") // ".zerostarter.localhost" (portless worktree)
 * getCookieDomain("https://myapp-api.vercel.app")        // undefined (public suffix, host-only)
 * getCookieDomain("http://localhost:4000")               // undefined
 */
export function getCookieDomain(url: string): string | undefined {
  try {
    const { hostname } = new URL(url)
    if (hostname === "localhost" || hostname === "127.0.0.1") return undefined
    const parts = hostname.split(".")
    // Local dev (portless *.localhost): share the cookie across the base `<name>.localhost` so the web and api subdomains, branch-prefixed in a worktree, both receive it.
    if (parts.at(-1) === "localhost") {
      return parts.length >= 2 ? `.${parts.slice(-2).join(".")}` : undefined
    }
    if (parts.length <= 2) return undefined
    // IPv4 hosts cannot carry a Domain cookie, so stay host-only. (A bare two-part-TLD domain like example.co.uk is also unsupported: the curated suffix set does not know ccTLD second levels, so an api under one should use a subdomain such as api.example.co.uk.)
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return undefined
    // Public-suffix hosting apex (e.g. *.vercel.app): a Domain cookie there is rejected by browsers, so stay host-only and let split mode take over.
    if (isPublicHostingSuffix(hostname)) return undefined
    return `.${parts.slice(1).join(".")}`
  } catch {
    return undefined
  }
}

/**
 * Extracts the cookie prefix from a URL for environment-specific cookie isolation.
 * Returns undefined for production (uses Better Auth default prefix).
 *
 * @example
 * getCookiePrefix("https://api.example.com")             // undefined (production, uses default)
 * getCookiePrefix("https://api.canary.example.com")      // "canary"
 * getCookiePrefix("https://api.dev.example.com")         // "dev"
 * getCookiePrefix("http://feat.api.zerostarter.localhost") // undefined (local dev, no prefix)
 * getCookiePrefix("http://localhost:4000")               // undefined
 */
export function getCookiePrefix(url: string): string | undefined {
  try {
    const { hostname } = new URL(url)
    if (hostname === "localhost" || hostname === "127.0.0.1") return undefined
    const parts = hostname.split(".")
    // Local dev (portless *.localhost): no env prefix; branches share one cookie under `<name>.localhost` and there is no cross-branch boundary to isolate.
    if (parts.at(-1) === "localhost") return undefined
    // 4+ parts means environment subdomain: api.canary.example.com
    if (parts.length >= 4) return parts[1]
    return undefined
  } catch {
    return undefined
  }
}

// The deployment shape, resolved once at module init from strings the api already has. Everything conditional (cookie attributes, the session handoff) branches on this value, never on env at request time, so a shared-domain deployment runs byte-identical code to a template without split support at all.
export type DeployMode =
  | { readonly kind: "host-only" }
  | { readonly kind: "shared-domain"; readonly cookieDomain: string }
  | { readonly kind: "split"; readonly webOrigin: string }

export function resolveDeployMode(appUrl: string, trustedOrigins: readonly string[]): DeployMode {
  // A shareable parent domain exists: the classic cross-subdomain setup (custom domains, portless localhost). Today's behavior, untouched.
  const cookieDomain = getCookieDomain(appUrl)
  if (cookieDomain) return { kind: "shared-domain", cookieDomain }
  // Split when a trusted origin is a distinct site from the api on a public suffix. isSplitPair is the one predicate the web client also uses, so server and client cannot disagree; the web origin is the first trusted origin that differs from the api's, not simply the first entry (HONO_TRUSTED_ORIGINS is an ordered list an operator may write api-first).
  for (const origin of trustedOrigins) {
    if (isSplitPair(origin, appUrl)) {
      try {
        return { kind: "split", webOrigin: new URL(origin).origin }
      } catch {
        // unreachable: isSplitPair already parsed this origin
      }
    }
  }
  return { kind: "host-only" }
}
