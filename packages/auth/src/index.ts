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
import { isLocal } from "@packages/env"
import { env } from "@packages/env/auth"
import { type BetterAuthPlugin, betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import {
  genericOAuth,
  openAPI as openAPIPlugin,
  organization as organizationPlugin,
} from "better-auth/plugins"

import { getCookieDomain, getCookiePrefix } from "@/lib/utils"

const cookieDomain = getCookieDomain(env.HONO_APP_URL)
const cookiePrefix = getCookiePrefix(env.HONO_APP_URL)

export const EMULATE_PROVIDER_ID = "github-emulate"
export const EMULATE_URL = "http://localhost:4567"

const emulateOAuthPlugin: BetterAuthPlugin = genericOAuth({
  config: [
    {
      providerId: EMULATE_PROVIDER_ID,
      clientId: "emulate",
      clientSecret: "emulate",
      authorizationUrl: `${EMULATE_URL}/login/oauth/authorize`,
      tokenUrl: `${EMULATE_URL}/login/oauth/access_token`,
      userInfoUrl: `${EMULATE_URL}/user`,
      scopes: ["read:user", "user:email"],
      mapProfileToUser: ({ name, login, email, avatar_url }) => ({
        name: name ?? login,
        email,
        image: avatar_url,
      }),
    },
  ],
})

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
    organizationPlugin({
      teams: { enabled: true },
    }),
    ...(isLocal(env.NODE_ENV) ? [emulateOAuthPlugin] : []),
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
  ...(isLocal(env.NODE_ENV)
    ? { account: { accountLinking: { enabled: true, trustedProviders: [EMULATE_PROVIDER_ID] } } }
    : {}),
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
