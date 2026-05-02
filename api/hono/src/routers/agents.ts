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
    // Trusting Origin is safe only because the router middleware above gates this to local.
    const origin = c.req.header("origin")
    if (!origin) {
      return c.json(
        { error: { code: "AGENTS_LOGIN_FAILED", message: "missing Origin header" } },
        500,
      )
    }

    const ctx = await auth.$context
    const existing = await ctx.internalAdapter.findUserByEmail(AGENT_EMAIL)
    const user =
      existing?.user ??
      (await ctx.internalAdapter.createUser({
        email: AGENT_EMAIL,
        name: AGENT_NAME,
        emailVerified: true,
      }))

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
    return c.redirect(`${origin}/dashboard`, 302)
  })
