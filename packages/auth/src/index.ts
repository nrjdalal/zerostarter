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
import { isProduction } from "@packages/env"
import { env } from "@packages/env/auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import {
  admin as adminPlugin,
  openAPI as openAPIPlugin,
  organization as organizationPlugin,
} from "better-auth/plugins"

import { baseDomainOf, buildTrustedOrigins } from "@/lib/origins"

// The canonical public WEB origin (browser-facing). Auth is same-origin: the browser calls the web host's
// /api/auth, Next rewrites it to this API. baseURL must be that web origin so OAuth callbacks return through
// the same-origin proxy (an api-origin baseURL bypasses it). The first trusted origin is that web origin.
const appOrigin = env.HONO_TRUSTED_ORIGINS[0]
// Wildcard subdomain origins are trusted only outside production (previews); production is a strict allowlist.
const allowWildcard = !isProduction(env.NODE_ENV)
const baseDomain = baseDomainOf(appOrigin)

export type SocialProvider = "github" | "google"
export type AuthProvider = SocialProvider | "magic-link"

// A provider is enabled only when both of its OAuth credentials are set; a fork can ship with any subset (or none, relying on magic link).
export const enabledSocialProviders: SocialProvider[] = [
  ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? (["github"] as const) : []),
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? (["google"] as const) : []),
]

export const auth = betterAuth({
  baseURL: appOrigin,
  trustedOrigins: buildTrustedOrigins(env.HONO_TRUSTED_ORIGINS, { baseDomain, allowWildcard }),
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
})

// Better Auth sets host-only cookies by default (no crossSubDomainCookies, no Domain), so a session set on one
// host is never sent to a sibling env. The API additionally rewrites the __Secure- prefix to __Host- on https
// (see api/hono/src/lib/host-cookie.ts) so a compromised sibling cannot plant a Domain cookie the host reads.

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

export { baseDomainOf, isTrustedOrigin } from "@/lib/origins"
