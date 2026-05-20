import { auth } from "@packages/auth"
import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { makeSignature } from "better-auth/crypto"
import { Hono } from "hono"
import { setCookie } from "hono/cookie"

const AGENT_EMAIL = "agent@zerostarter.dev"
const AGENT_NAME = "AgentZero"

export const agentsRouter = new Hono()
  .use(async (c, next) => (isLocal(env.NODE_ENV) ? next() : c.notFound()))
  .post("/sign-in-as", async (c) => {
    const fail = (message: string) =>
      c.json({ error: { code: "AGENTS_LOGIN_FAILED", message } }, 500)

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
