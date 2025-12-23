import { account, db, session, user, verification } from "@packages/db"
import { env } from "@packages/env/auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { openAPI } from "better-auth/plugins"
import { getCookieDomain } from "./lib/utils"

const cookieDomain = getCookieDomain(env.HONO_APP_URL)

export const auth = betterAuth({
  baseURL: env.HONO_APP_URL,
  trustedOrigins: env.HONO_TRUSTED_ORIGINS,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
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
  plugins: [openAPI()],
  ...(cookieDomain && {
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: cookieDomain,
      },
    },
  }),
})

export type Session = typeof auth.$Infer.Session
