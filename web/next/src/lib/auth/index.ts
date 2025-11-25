import { db } from "@/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { magicLink } from "better-auth/plugins"
import { Resend } from "resend"

import { account, session, user, verification } from "@/db/schema/auth"

export const auth = betterAuth({
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
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  plugins: [
    nextCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const resend = new Resend(process.env.RESEND_API_KEY as string)

        await resend.emails.send({
          from: "ACME Inc. <onboarding@tns.nrjdalal.com>",
          to: [email],
          subject: "Verify your email address",
          html: `Click the link to verify your email: ${url}`,
        })
      },
    }),
  ],
})
