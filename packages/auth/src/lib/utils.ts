// The tldts fields (parsed with allowPrivateDomains) auth reads to shape session cookies; a structural subset of tldts's result, baked into the bundle so @packages/auth carries no tldts dependency of its own.
export type ParsedHost = {
  domain: string | null
  isIp: boolean
  isPrivate: boolean | null
  publicSuffix: string | null
  subdomain: string | null
}

// Reconcile the app host's tldts breakdown into the session cookie config, plus tldts's own isPrivate flag passed through.
export function cookieConfig({ domain, isIp, isPrivate, publicSuffix, subdomain }: ParsedHost): {
  cookieDomain?: string
  cookiePrefix?: string
  isPrivate: boolean | null
} {
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

// Portless serves dev over .localhost subdomains (api.<name>.localhost) injected at runtime, which the build-time breakdown, baked from the fixed-ports .env, cannot see. Re-derive the host from a runtime .localhost app URL so web and api share one Domain cookie; no Public Suffix List is needed since ".localhost" is the known suffix. Bare localhost (Docker, PORTLESS=0) and every real deploy return null and fall through to the baked breakdown.
export function localhostHost(appUrl: string): ParsedHost | null {
  let hostname: string
  try {
    hostname = new URL(appUrl).hostname
  } catch {
    return null
  }
  if (!hostname.endsWith(".localhost")) return null
  const labels = hostname.split(".")
  return {
    domain: labels.slice(-2).join("."),
    isIp: false,
    isPrivate: false,
    publicSuffix: "localhost",
    subdomain: labels.slice(0, -2).join("."),
  }
}
