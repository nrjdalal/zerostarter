export function getCookieDomain(url: string): string | undefined {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    // Extract root domain (e.g. "api.zerostarter.dev" -> "zerostarter.dev")
    const parts = hostname.split(".")
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join(".")
      return `.${rootDomain}`
    }
    return undefined
  } catch {
    return undefined
  }
}
