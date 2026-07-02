import { passkey as passkeyPlugin } from "@better-auth/passkey"
import { site } from "@packages/config/site"
import {
  account,
  db,
  invitation,
  member,
  organization,
  passkey,
  session,
  team,
  teamMember,
  user,
  verification,
} from "@packages/db"
import { env } from "@packages/env/auth"
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import {
  admin as adminPlugin,
  lastLoginMethod as lastLoginMethodPlugin,
  openAPI as openAPIPlugin,
  organization as organizationPlugin,
} from "better-auth/plugins"

import { getCookieDomain, getCookiePrefix } from "@/lib/utils"

const cookieDomain = getCookieDomain(env.HONO_APP_URL)
const cookiePrefix = getCookiePrefix(env.HONO_APP_URL)
const trustedOrigins = env.HONO_TRUSTED_ORIGINS
const rpID = env.BETTER_AUTH_RP_ID ?? new URL(env.HONO_APP_URL).hostname

function isOriginInRpIDScope(origin: string, rpID: string) {
  const hostname = new URL(origin).hostname
  return hostname === rpID || hostname.endsWith(`.${rpID}`)
}

const incompatibleOrigin = trustedOrigins.find((origin) => !isOriginInRpIDScope(origin, rpID))

if (incompatibleOrigin) {
  throw new Error(
    `BETTER_AUTH_RP_ID (${rpID}) must be equal to, or a parent domain of, every trusted origin. ${incompatibleOrigin} is outside that WebAuthn scope.`,
  )
}

export type SocialProvider = "github" | "google"
export type AuthProvider = SocialProvider | "magic-link" | "passkey"

// A provider is enabled only when both of its OAuth credentials are set; a fork can ship with any subset (or none, relying on magic link).
export const enabledSocialProviders: SocialProvider[] = [
  ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? (["github"] as const) : []),
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? (["google"] as const) : []),
]

export const auth = betterAuth({
  baseURL: env.HONO_APP_URL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      account,
      invitation,
      member,
      organization,
      passkey,
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
    lastLoginMethodPlugin(),
    passkeyPlugin({
      rpID,
      rpName: site.name,
      origin: trustedOrigins,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
    }),
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
    ...(cookieDomain && {
      crossSubDomainCookies: {
        enabled: true,
        domain: cookieDomain,
      },
    }),
  },
})

// Magic-link sign-in shows in the UI only when its server plugin is registered; add `magicLink({ sendMagicLink })` to the plugins above (and implement the sender) to enable it.
export const magicLinkEnabled = (auth.options.plugins ?? []).some(
  (p) => (p.id as string) === "magic-link",
)

export const passkeyEnabled = (auth.options.plugins ?? []).some(
  (p) => (p.id as string) === "passkey",
)

// The unified list of enabled sign-in providers the UI reads: social providers plus magic link when its server plugin is registered.
export const enabledProviders: AuthProvider[] = [
  ...enabledSocialProviders,
  ...(magicLinkEnabled ? (["magic-link"] as const) : []),
  ...(passkeyEnabled ? (["passkey"] as const) : []),
]

export type Session = typeof auth.$Infer.Session

export type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
}
