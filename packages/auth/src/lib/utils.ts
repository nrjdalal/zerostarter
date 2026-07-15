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
// Multi-tenant hosting domains are public suffixes: browsers reject cookies scoped to them, so cookie sharing is impossible there and split mode takes over.
const PUBLIC_HOSTING_SUFFIXES = new Set([
  "vercel.app",
  "netlify.app",
  "pages.dev",
  "github.io",
  "fly.dev",
])

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
    const candidate = parts.slice(1).join(".")
    if (PUBLIC_HOSTING_SUFFIXES.has(candidate)) return undefined
    return `.${candidate}`
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
  | { readonly kind: "shared-domain"; readonly cookieDomain: string }
  | { readonly kind: "host-only" }
  | { readonly kind: "split"; readonly webOrigin: string }

export function resolveDeployMode(appUrl: string, trustedOrigins: readonly string[]): DeployMode {
  // A shareable parent domain exists: the classic cross-subdomain setup (custom domains, portless localhost). Today's behavior, untouched.
  const cookieDomain = getCookieDomain(appUrl)
  if (cookieDomain) return { kind: "shared-domain", cookieDomain }
  try {
    const api = new URL(appUrl)
    const web = trustedOrigins[0] ? new URL(trustedOrigins[0]) : null
    const suffix = api.hostname.split(".").slice(1).join(".")
    if (web && PUBLIC_HOSTING_SUFFIXES.has(suffix) && web.origin !== api.origin) {
      return { kind: "split", webOrigin: web.origin }
    }
  } catch {
    // fall through to host-only
  }
  return { kind: "host-only" }
}
