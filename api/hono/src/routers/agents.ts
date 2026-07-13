import { auth } from "@packages/auth"
import { site } from "@packages/config/site"
import { db, user as userTable } from "@packages/db"
import { env } from "@packages/env/api-hono"
import { makeSignature } from "better-auth/crypto"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import { setCookie } from "hono/cookie"

import { agentSignInEnabled } from "@/lib/agent-signin"
import { ApiError } from "@/lib/error"

const AGENT_EMAIL = site.agent.email
const AGENT_NAME = site.agent.name

export const agentsRouter = new Hono()
  .use(async (c, next) => (agentSignInEnabled() ? next() : c.notFound()))
  .post("/sign-in-as", async (c) => {
    const fail = (message: string): never => {
      throw new ApiError(500, "AGENT_LOGIN_FAILED", message)
    }

    const origin = c.req.header("origin")
    if (!origin) return fail("missing Origin header")
    if (!env.HONO_TRUSTED_ORIGINS.includes(origin)) return fail("untrusted Origin")
    const dashboardUrl = `${origin}/dashboard`

    const ctx = await auth.$context
    const existing = await ctx.internalAdapter.findUserByEmail(AGENT_EMAIL)

    let user
    if (existing) {
      user = await ctx.internalAdapter.updateUserByEmail(AGENT_EMAIL, {
        name: AGENT_NAME,
        emailVerified: true,
      })
      if (!user) return fail("user update failed")
    } else {
      try {
        user = await ctx.internalAdapter.createUser({
          email: AGENT_EMAIL,
          name: AGENT_NAME,
          emailVerified: true,
        })
      } catch (err) {
        console.error("POST /api/agents/sign-in-as createUser failed:", err)
        const raced = await ctx.internalAdapter.findUserByEmail(AGENT_EMAIL)
        if (!raced) return fail("user creation failed")
        user = raced.user
      }
    }

    // The local-only agent is an internal account, so grant it the admin role (console access).
    await db.update(userTable).set({ role: "admin" }).where(eq(userTable.id, user.id))

    const session = await ctx.internalAdapter.createSession(user.id)
    const signed = `${session.token}.${await makeSignature(session.token, ctx.secret)}`
    const { name, attributes } = ctx.authCookies.sessionToken
    setCookie(c, name, signed, {
      path: attributes.path,
      maxAge: attributes.maxAge,
      httpOnly: attributes.httpOnly ?? true,
      secure: attributes.secure,
      sameSite: attributes.sameSite ?? "Lax",
      domain: attributes.domain,
    })
    return c.redirect(dashboardUrl, 302)
  })
