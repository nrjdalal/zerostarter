// The registrable base domain (last two labels) of a URL, or undefined for localhost/IP (api.zerostarter.dev -> zerostarter.dev; localhost -> undefined).
export function baseDomainOf(url: string): string | undefined {
  try {
    const { hostname } = new URL(url)
    if (hostname === "localhost" || hostname === "127.0.0.1") return undefined
    const parts = hostname.split(".")
    if (parts.length < 2) return undefined
    return parts.slice(-2).join(".")
  } catch {
    return undefined
  }
}

// Whether an Origin is trusted: an exact allowlist match always, plus any subdomain of baseDomain when wildcards are allowed (non-production only). Production stays a strict exact allowlist.
export function isTrustedOrigin(
  origin: string | undefined | null,
  allowlist: string[],
  opts: { baseDomain?: string; allowWildcard: boolean },
): boolean {
  if (!origin) return false
  const normalized = origin.replace(/\/$/, "")
  if (allowlist.includes(normalized)) return true
  if (!opts.allowWildcard || !opts.baseDomain) return false
  try {
    const { hostname } = new URL(origin)
    return hostname === opts.baseDomain || hostname.endsWith(`.${opts.baseDomain}`)
  } catch {
    return false
  }
}

// The trustedOrigins value Better Auth consumes: the exact allowlist, plus wildcard subdomain patterns (both schemes) only when non-production. Better Auth's `*` spans dots, so one pattern covers api.<base> too.
export function buildTrustedOrigins(
  allowlist: string[],
  opts: { baseDomain?: string; allowWildcard: boolean },
): string[] {
  if (!opts.allowWildcard || !opts.baseDomain) return allowlist
  return [...allowlist, `https://*.${opts.baseDomain}`, `http://*.${opts.baseDomain}`]
}
