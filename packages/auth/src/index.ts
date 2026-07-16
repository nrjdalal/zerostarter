import { isPublicHostingSuffix } from "@packages/config/deploy"
import {
  account,
  db,
  invitation,
  member,
  organization,
  session,
  team,
  teamMember,
  user,
  verification,
} from "@packages/db"
import { env } from "@packages/env/auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import {
  admin as adminPlugin,
  openAPI as openAPIPlugin,
  organization as organizationPlugin,
} from "better-auth/plugins"

import { getCookiePrefix, resolveDeployMode } from "@/lib/utils"

// Resolved once at module init; the handoff router reads it. The web client makes its own split decision via isSplitPair (from @packages/config/deploy), since this server-env module must never reach the client bundle.
export const deployMode = resolveDeployMode(env.HONO_APP_URL, env.HONO_TRUSTED_ORIGINS)
const cookiePrefix = getCookiePrefix(env.HONO_APP_URL)

// A public-suffix host that did not resolve to split (no web origin distinct from the api in HONO_TRUSTED_ORIGINS) means cookies cannot be shared and the handoff is off, so sign-in dies silently post-OAuth. Warn loudly at boot.
if (deployMode.kind === "host-only" && isPublicHostingSuffix(new URL(env.HONO_APP_URL).hostname)) {
  console.warn(
    "[auth] HONO_APP_URL is on a public-suffix host but HONO_TRUSTED_ORIGINS has no distinct web origin, so split-deploy sign-in is off and OAuth will fail with state_mismatch. Set HONO_TRUSTED_ORIGINS to your web origin, or use a custom domain.",
  )
}

// In split mode the web origin is inferred as the first trusted origin that differs from the api. HONO_TRUSTED_ORIGINS is a CORS allowlist that can hold several, so warn if more than one distinct non-api origin is trusted: the inference could pick the wrong site (not a leak, the nonce cookie lives on the real web origin, but a baffling misroute).
if (deployMode.kind === "split") {
  const apiOrigin = new URL(env.HONO_APP_URL).origin
  const nonApiOrigins = new Set(
    env.HONO_TRUSTED_ORIGINS.map((o) => {
      try {
        return new URL(o).origin
      } catch {
        return ""
      }
    }).filter((o) => o && o !== apiOrigin),
  )
  if (nonApiOrigins.size > 1) {
    console.warn(
      `[auth] split mode treats the first non-api HONO_TRUSTED_ORIGINS entry as the web origin (${deployMode.webOrigin}), but ${nonApiOrigins.size} distinct non-api origins are trusted. List the web origin first if that is not it.`,
    )
  }
}

// Shared-domain scopes the session cookie to cookieDomain; if no trusted origin sits under it, the web app can never receive that cookie and sign-in fails silently after OAuth. Warn at boot. (A correct config, custom domain or portless localhost, always lists a web origin under the domain, so this stays quiet.)
if (deployMode.kind === "shared-domain") {
  const domain = deployMode.cookieDomain
  const bare = domain.slice(1)
  const underDomain = env.HONO_TRUSTED_ORIGINS.some((o) => {
    try {
      const { hostname } = new URL(o)
      return hostname === bare || hostname.endsWith(domain)
    } catch {
      return false
    }
  })
  if (!underDomain) {
    console.warn(
      `[auth] cookies are scoped to ${domain}, but no HONO_TRUSTED_ORIGINS entry is under it, so the web app cannot receive the session cookie. Add your web origin (under ${bare}) to HONO_TRUSTED_ORIGINS.`,
    )
  }
}

export type SocialProvider = "github" | "google"
export type AuthProvider = SocialProvider | "magic-link"

// A provider is enabled only when both of its OAuth credentials are set; a fork can ship with any subset (or none, relying on magic link).
export const enabledSocialProviders: SocialProvider[] = [
  ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? (["github"] as const) : []),
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? (["google"] as const) : []),
]

export const auth = betterAuth({
  baseURL: env.HONO_APP_URL,
  trustedOrigins: env.HONO_TRUSTED_ORIGINS,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      account,
      invitation,
      member,
      organization,
      session,
      team,
      teamMember,
      user,
      verification,
    },
  }),
  onAPIError: {
    throw: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300,
    },
  },
  plugins: [
    openAPIPlugin(),
    organizationPlugin({
      teams: { enabled: true },
    }),
    adminPlugin(),
  ],
  socialProviders: {
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
      : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
  },
  advanced: {
    ...(cookiePrefix && { cookiePrefix }),
    // Shared-domain (custom domains, portless localhost): today's cross-subdomain cookies, byte-identical.
    ...(deployMode.kind === "shared-domain" && {
      crossSubDomainCookies: {
        enabled: true,
        domain: deployMode.cookieDomain,
      },
    }),
    // Split (two projects on a public hosting suffix): host-only SameSite=None, the only attributes browsers store across two unrelated sites.
    ...(deployMode.kind === "split" && {
      defaultCookieAttributes: {
        sameSite: "none" as const,
        secure: true,
      },
    }),
  },
})

// Magic-link sign-in shows in the UI only when its server plugin is registered; add `magicLink({ sendMagicLink })` to the plugins above (and implement the sender) to enable it.
export const magicLinkEnabled = (auth.options.plugins ?? []).some(
  (p) => (p.id as string) === "magic-link",
)

// The unified list of enabled sign-in providers the UI reads: social providers plus magic link when its server plugin is registered.
export const enabledProviders: AuthProvider[] = [
  ...enabledSocialProviders,
  ...(magicLinkEnabled ? (["magic-link"] as const) : []),
]

export type Session = typeof auth.$Infer.Session
