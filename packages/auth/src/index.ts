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
import { emulateOAuthConfig, EMULATE_PROVIDER_ID } from "@packages/emulate"
import { isLocal } from "@packages/env"
import { env } from "@packages/env/auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { openAPI as openAPIPlugin, organization as organizationPlugin } from "better-auth/plugins"

import { getCookieDomain, getCookiePrefix } from "@/lib/utils"

const cookieDomain = getCookieDomain(env.HONO_APP_URL)
const cookiePrefix = getCookiePrefix(env.HONO_APP_URL)

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
  plugins: [
    openAPIPlugin(),
    organizationPlugin({ teams: { enabled: true } }),
    ...(isLocal(env.NODE_ENV)
      ? [
          emulateOAuthConfig({
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  ...(isLocal(env.NODE_ENV) && {
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["github", "google", EMULATE_PROVIDER_ID],
      },
    },
  }),
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

export type Session = typeof auth.$Infer.Session
