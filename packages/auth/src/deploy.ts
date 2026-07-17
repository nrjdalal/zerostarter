// The same-or-cross decision, pure and client-safe: no env, no database, no PSL. The one implementation both sides use, so they cannot drift: the auth package runs it at boot from validated env (the api's baked COOKIE_DOMAIN facts plus HONO_TRUSTED_ORIGINS), and next.config.ts runs it at build to bake the client's NEXT_PUBLIC_DEPLOY_MODE literal. The Public Suffix List judgment arrives pre-computed in info.isPublicSuffix (see @packages/env/deploy); everything here is plain string work.

export type DeployResolution =
  | { readonly kind: "host-only" }
  | { readonly kind: "shared"; readonly cookieDomain: string }
  | { readonly kind: "split"; readonly webOrigin: string }

// shared: a usable parent domain (present, not a public suffix) covers some trusted web origin, the classic cross-subdomain setup. split: any remaining pair of distinct hosts, where only the session handoff can carry sign-in. host-only: no distinct web origin at all (one site, an api-only deploy, plain-localhost dev), where host-only cookies already do everything needed.
export function resolveDeployMode(
  info: { domain?: string; isPublicSuffix: boolean },
  apiUrl: string,
  trustedOrigins: readonly string[],
): DeployResolution {
  let apiHost: string
  try {
    apiHost = new URL(apiUrl).hostname
  } catch {
    return { kind: "host-only" }
  }
  const webHosts: { origin: string; hostname: string }[] = []
  for (const origin of trustedOrigins) {
    try {
      const url = new URL(origin)
      // Same hostname (any port) is one site sharing host-only cookies already; only a different host is a web counterpart. HONO_TRUSTED_ORIGINS is an ordered CORS allowlist an operator may write api-first.
      if (url.hostname !== apiHost) webHosts.push({ origin: url.origin, hostname: url.hostname })
    } catch {
      // skip malformed entries; the env schema validates these, so this only guards direct callers
    }
  }
  const domain = info.domain
  if (domain && !info.isPublicSuffix) {
    const bare = domain.slice(1)
    const covered = webHosts.some((web) => web.hostname === bare || web.hostname.endsWith(domain))
    if (covered) return { kind: "shared", cookieDomain: domain }
  }
  const web = webHosts[0]
  if (web) return { kind: "split", webOrigin: web.origin }
  return { kind: "host-only" }
}
