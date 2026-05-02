// Eject: rm -rf packages/emulate, drop the workspace dep, drop 3 imports from
// packages/auth/src/index.ts and api/hono/src/index.ts. See AGENTS.md.
import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import type { BetterAuthPlugin } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { Hono } from "hono"

export type AuthLike = {
  api: Record<"signInWithOAuth2" | "oAuth2Callback", (a: unknown) => Promise<Response>>
}

const PROVIDER_ID = "github-emulate"
const EMULATOR_URL = "http://localhost:4001"

export const emulateAccountLinking = {
  account: {
    accountLinking: { enabled: true, trustedProviders: [PROVIDER_ID] },
  },
}

export const emulateOAuthConfig = (): BetterAuthPlugin =>
  genericOAuth({
    config: [
      {
        providerId: PROVIDER_ID,
        clientId: "emulate",
        clientSecret: "emulate",
        authorizationUrl: `${EMULATOR_URL}/login/oauth/authorize`,
        tokenUrl: `${EMULATOR_URL}/login/oauth/access_token`,
        userInfoUrl: `${EMULATOR_URL}/user`,
        scopes: ["read:user", "user:email"],
        mapProfileToUser: ({ name, login, email, avatar_url }) => ({
          name: name ?? login,
          email,
          image: avatar_url,
        }),
      },
    ],
  })

export const createAgentsRouter = (auth: AuthLike) =>
  new Hono()
    .use(async (c, next) => (isLocal(env.NODE_ENV) ? next() : c.notFound()))
    .post("/sign-in-as", async (c) => {
      const fail = (message: string) =>
        c.json({ error: { code: "AGENTS_LOGIN_FAILED", message } }, 500)
      const dashboardUrl = `${env.HONO_TRUSTED_ORIGINS[0]}/dashboard`

      const authorize = await auth.api.signInWithOAuth2({
        body: { providerId: PROVIDER_ID, callbackURL: dashboardUrl },
        asResponse: true,
      })
      const { url: authorizeUrl } = (await authorize.json()) as { url: string }
      // Cookie header is name=value pairs only; getSetCookie() avoids the multi-cookie collapse
      const stateCookie = authorize.headers
        .getSetCookie()
        .map((setCookie) => setCookie.split(";")[0])
        .join("; ")

      const pickerForm = new URL(authorizeUrl).searchParams
      pickerForm.set("login", c.req.query("user") ?? "AgentZero")
      const pickerResponse = await fetch(`${EMULATOR_URL}/login/oauth/callback`, {
        method: "POST",
        body: pickerForm,
        redirect: "manual",
      })
      const location = pickerResponse.headers.get("location")
      if (!location) return fail("emulator picker did not redirect")
      const callbackParams = new URL(location).searchParams
      const code = callbackParams.get("code")
      const state = callbackParams.get("state")
      if (!code || !state) return fail("emulator did not return code/state")

      const session = await auth.api.oAuth2Callback({
        query: { code, state },
        params: { providerId: PROVIDER_ID },
        headers: new Headers({ cookie: stateCookie }),
        asResponse: true,
      })
      session.headers
        .getSetCookie()
        .forEach((setCookie) => c.header("Set-Cookie", setCookie, { append: true }))
      return c.redirect(dashboardUrl, 302)
    })
