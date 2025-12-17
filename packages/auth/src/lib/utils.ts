export function getCookieDomain(url: string): string | undefined {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    const parts = hostname.split(".")

    // need at least 2 parts for a valid domain (e.g., "example.com")
    if (parts.length < 2) return undefined

    const rootDomain = parts.slice(-2).join(".") // e.g., "zerostarter.dev"

    // for 2-part domains (e.g., "zerostarter.dev"), use root domain
    if (parts.length === 2) return `.${rootDomain}`

    // for 3+ part domains, check if it's an environment-specific subdomain
    // Examples:
    // - "dev-api.zerostarter.dev" -> ".dev.zerostarter.dev" (parts: ['dev-api', 'zerostarter', 'dev'])
    // - "dev.zerostarter.dev" -> ".dev.zerostarter.dev" (parts: ['dev', 'zerostarter', 'dev'])
    // - "staging-api.zerostarter.dev" -> ".staging.zerostarter.dev" (parts: ['staging-api', 'zerostarter', 'dev'])
    // - "api.zerostarter.dev" -> ".zerostarter.dev" (production) (parts: ['api', 'zerostarter', 'dev'])

    if (parts.length >= 3) {
      const firstPart = parts[0] // e.g., "dev-api", "dev", "staging-api", "api"

      // check if first part starts with environment prefix (dev- or staging-)
      if (firstPart.startsWith("dev-")) return `.dev.${rootDomain}`
      if (firstPart.startsWith("staging-")) return `.staging.${rootDomain}`
      if (firstPart === "dev" || firstPart === "staging") return `.${firstPart}.${rootDomain}`
    }

    // default: use root domain (for production: "api.zerostarter.dev" -> ".zerostarter.dev")
    return `.${rootDomain}`
  } catch {
    return undefined
  }
}
