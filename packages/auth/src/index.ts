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
import { eq } from "drizzle-orm"

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
  databaseHooks: {
    session: {
      create: {
        // Promote configured admin emails to the `admin` role on every sign-in (covers existing accounts, not just sign-up), so setting CONSOLE_ADMIN_EMAILS + re-login grants console access without a manual DB edit.
        before: async (newSession) => {
          if (env.CONSOLE_ADMIN_EMAILS.length === 0) return
          const [u] = await db
            .select({ email: user.email, emailVerified: user.emailVerified, role: user.role })
            .from(user)
            .where(eq(user.id, newSession.userId))
            .limit(1)
          if (
            u?.emailVerified &&
            u.role !== "admin" &&
            env.CONSOLE_ADMIN_EMAILS.includes(u.email.toLowerCase())
          ) {
            await db.update(user).set({ role: "admin" }).where(eq(user.id, newSession.userId))
          }
        },
      },
    },
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
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
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

export type Session = typeof auth.$Infer.Session
