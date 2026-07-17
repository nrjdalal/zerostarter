// The tldts fields (parsed with allowPrivateDomains) auth reads to shape session cookies; a structural subset of tldts's result, baked into the bundle so @packages/auth carries no tldts dependency of its own.
export type ParsedHost = {
  domain: string | null
  isIp: boolean
  isPrivate: boolean | null
  publicSuffix: string | null
  subdomain: string | null
}

export type CookieConfig = {
  cookieDomain?: string
  cookiePrefix?: string
  isPrivate: boolean | null
}

// Reconcile the app host's tldts breakdown into the session cookie config, plus tldts's own isPrivate flag passed through.
export function cookieConfig({
  domain,
  isIp,
  isPrivate,
  publicSuffix,
  subdomain,
}: ParsedHost): CookieConfig {
  // Cross-subdomain cookie domain: a portless *.localhost base shares under its own domain, otherwise drop the api leaf label and scope to the rest. None for an IP, or a bare or apex host with nothing to share under.
  let cookieDomain: string | undefined
  if (!isIp && domain) {
    if (publicSuffix === "localhost") cookieDomain = `.${domain}`
    else if (subdomain) cookieDomain = `.${[...subdomain.split(".").slice(1), domain].join(".")}`
  }

  // Environment isolation prefix: the label beneath the api leaf (api.canary.example.com yields canary). None for local .localhost dev and single-label subdomains.
  let cookiePrefix: string | undefined
  if (publicSuffix !== "localhost" && subdomain) {
    const labels = subdomain.split(".")
    if (labels.length >= 2) cookiePrefix = labels[1]
  }

  // isPrivate is tldts's own flag, passed through: true when the app sits on a PSL private-section hosting suffix (vercel.app, pages.dev, github.io), where sibling deployments cannot share a cross-subdomain cookie. Null for an IP.
  return { cookieDomain, cookiePrefix, isPrivate }
}

// The deployment shape, resolved once at module init from the baked host and the api's own env. Everything conditional (cookie attributes, the session handoff) branches on this value, never on env at request time, so a shared-domain deployment runs byte-identical code to a template without split support at all.
export type DeployMode =
  | { readonly kind: "host-only"; readonly cookiePrefix?: string }
  | {
      readonly kind: "shared-domain"
      readonly cookieDomain: string
      readonly cookiePrefix?: string
    }
  | { readonly kind: "split"; readonly webOrigin: string; readonly cookiePrefix?: string }

// A shareable parent domain (cookieDomain) is the classic cross-subdomain setup, custom domains and portless localhost, today's behavior. Else a PSL private-section host (isPrivate, e.g. *.vercel.app) with a distinct trusted web origin is split, where sign-in routes through the api's handoff. Else host-only. isPrivate comes straight from the baked tldts breakdown, so there is no curated public-suffix list to drift.
export function resolveDeployMode(
  config: CookieConfig,
  apiUrl: string,
  trustedOrigins: readonly string[],
): DeployMode {
  const { cookieDomain, cookiePrefix, isPrivate } = config
  if (cookieDomain) return { kind: "shared-domain", cookieDomain, cookiePrefix }
  if (isPrivate) {
    // The web origin is the first trusted origin distinct from the api's, not simply the first entry (HONO_TRUSTED_ORIGINS is an ordered CORS list an operator may write api-first).
    const apiOrigin = originOf(apiUrl)
    for (const origin of trustedOrigins) {
      const webOrigin = originOf(origin)
      if (webOrigin !== "" && webOrigin !== apiOrigin) {
        return { kind: "split", webOrigin, cookiePrefix }
      }
    }
  }
  return { kind: "host-only", cookiePrefix }
}

function originOf(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return ""
  }
}
