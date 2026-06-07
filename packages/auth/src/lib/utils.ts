/**
 * Extracts the cookie domain from a URL for cross-subdomain cookie sharing.
 *
 * @example
 * getCookieDomain("https://api.example.com")             // ".example.com"
 * getCookieDomain("https://api.canary.example.com")      // ".canary.example.com"
 * getCookieDomain("https://api.dev.example.com")         // ".dev.example.com"
 * getCookieDomain("http://localhost:4000")               // undefined
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
 * getCookiePrefix("https://api.example.com")             // undefined (production, uses default)
 * getCookiePrefix("https://api.canary.example.com")      // "canary"
 * getCookiePrefix("https://api.dev.example.com")         // "dev"
 * getCookiePrefix("http://localhost:4000")               // undefined
 */
export function getCookiePrefix(url: string): string | undefined {
  try {
    const { hostname } = new URL(url)
    if (hostname === "localhost" || hostname === "127.0.0.1") return undefined
    const parts = hostname.split(".")
    // 4+ parts means environment subdomain: api.canary.example.com
    if (parts.length >= 4) return parts[1]
    return undefined
  } catch {
    return undefined
  }
}
