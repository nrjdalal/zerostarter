/**
 * Extracts the cookie domain from a URL for cross-subdomain cookie sharing.
 *
 * @example
 * getCookieDomain("https://api.zerostarter.dev")             // ".zerostarter.dev"
 * getCookieDomain("https://api.canary.zerostarter.dev")      // ".canary.zerostarter.dev"
 * getCookieDomain("https://api.dev.zerostarter.dev")         // ".dev.zerostarter.dev"
 * getCookieDomain("http://localhost:4000")                   // undefined
 */
export function getCookieDomain(url: string): string | undefined {
  try {
    const { hostname } = new URL(url)
    if (hostname === "localhost" || hostname === "127.0.0.1") return undefined
    const parts = hostname.split(".")
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
 * getCookiePrefix("https://api.zerostarter.dev")             // undefined (production, uses default)
 * getCookiePrefix("https://api.canary.zerostarter.dev")      // "canary"
 * getCookiePrefix("https://api.dev.zerostarter.dev")         // "dev"
 * getCookiePrefix("http://localhost:4000")                   // undefined
 */
export function getCookiePrefix(url: string): string | undefined {
  try {
    const { hostname } = new URL(url)
    if (hostname === "localhost" || hostname === "127.0.0.1") return undefined
    const parts = hostname.split(".")
    // 4+ parts means environment subdomain: api.canary.zerostarter.dev
    if (parts.length >= 4) return parts[1]
    return undefined
  } catch {
    return undefined
  }
}
