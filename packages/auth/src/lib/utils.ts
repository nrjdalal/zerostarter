/**
 * Extracts the cookie domain from a URL for cross-subdomain cookie sharing.
 *
 * @example
 * getCookieDomain("https://api.example.com")             // ".example.com"
 * getCookieDomain("https://api.canary.example.com")      // ".canary.example.com"
 * getCookieDomain("https://api.dev.example.com")         // ".dev.example.com"
 * getCookieDomain("http://api.zerostarter.localhost")    // ".zerostarter.localhost" (portless dev)
 * getCookieDomain("http://feat.api.zerostarter.localhost") // ".zerostarter.localhost" (portless worktree)
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
