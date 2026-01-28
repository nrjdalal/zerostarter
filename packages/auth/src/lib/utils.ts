/**
 * Extracts the cookie domain from a URL by stripping the first subdomain.
 * Useful for sharing cookies across environment subdomains
 * (api, production, staging, canary, development, dev, test, etc.)
 *
 * @example
 * getCookieDomain("https://api.zerostarter.dev")             // ".zerostarter.dev"
 * getCookieDomain("https://api.canary.zerostarter.dev")      // ".canary.zerostarter.dev"
 * getCookieDomain("https://api.dev.zerostarter.dev")         // ".dev.zerostarter.dev"
 * getCookieDomain("https://api.development.zerostarter.dev") // ".development.zerostarter.dev"
 * getCookieDomain("https://api.staging.zerostarter.dev")     // ".staging.zerostarter.dev"
 * getCookieDomain("https://api.test.zerostarter.dev")        // ".test.zerostarter.dev"
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
