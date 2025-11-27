import { db } from "@/db"
import { env } from "@/env"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { openAPI } from "better-auth/plugins"

import { account, session, user, verification } from "@/db/schema/auth"

export const auth = betterAuth({
  baseURL: env.HONO_PUBLIC_APP_URL,
  trustedOrigins: env.HONO_PUBLIC_ORIGINS,
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
  },
  plugins: [openAPI()],
})
