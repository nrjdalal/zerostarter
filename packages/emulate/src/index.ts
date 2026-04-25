// Eject: `rm -rf packages/emulate` + drop the workspace dep + 3 import lines from
// packages/auth/src/index.ts and api/hono/src/index.ts. See AGENTS.md for usage.
import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import type { BetterAuthPlugin } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { Hono } from "hono"

// genericOAuth plugin endpoints aren't surfaced on the base Auth type — narrow to what we use
export type AuthLike = {
  api: {
    signInWithOAuth2: (a: unknown) => Promise<Response>
    oAuth2Callback: (a: unknown) => Promise<Response>
  }
}

const EMULATE_PROVIDER_ID = "github-emulate"
const EMULATE_GITHUB = "http://localhost:4001"

export const emulateAccountLinking = () => ({
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github", "google", EMULATE_PROVIDER_ID],
    },
  },
})

export const emulateOAuthConfig = (creds: {
  clientId: string
  clientSecret: string
}): BetterAuthPlugin =>
  genericOAuth({
    config: [
      {
        providerId: EMULATE_PROVIDER_ID,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        authorizationUrl: `${EMULATE_GITHUB}/login/oauth/authorize`,
        tokenUrl: `${EMULATE_GITHUB}/login/oauth/access_token`,
        userInfoUrl: `${EMULATE_GITHUB}/user`,
        scopes: ["read:user", "user:email"],
        pkce: false,
        mapProfileToUser: (p) => ({
          name: p.name ?? p.login,
          email: p.email,
          image: p.avatar_url,
        }),
      },
    ],
  })

export const createAgentsRouter = (auth: AuthLike) =>
  new Hono()
    .use(async (c, next) => {
      // belt-and-suspenders: explicit prod block + positive isLocal check
      if (env.NODE_ENV === "production" || !isLocal(env.NODE_ENV)) {
        return c.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, 403)
      }
      return next()
    })
    .post("/sign-in-as", async (c) => {
      const fail = (message: string) =>
        c.json({ error: { code: "AGENTS_LOGIN_FAILED", message } }, 500)
      const { signInWithOAuth2, oAuth2Callback } = auth.api

      const userLogin = c.req.query("user") ?? "AgentZero"
      const APP_URL = env.HONO_TRUSTED_ORIGINS[0]

      const init = await signInWithOAuth2({
        body: { providerId: EMULATE_PROVIDER_ID, callbackURL: `${APP_URL}/dashboard` },
        asResponse: true,
      })
      const { url } = (await init.json()) as { url?: string }
      if (!url) return fail("no authorize url")
      const params = new URL(url).searchParams
      const state = params.get("state")
      const clientId = params.get("client_id")
      const redirectUri = params.get("redirect_uri")
      if (!state || !clientId || !redirectUri) return fail("malformed authorize url")
      // headers.get("set-cookie") collapses multiple cookies in some runtimes; use getSetCookie()
      const stateCookie = init.headers
        .getSetCookie()
        .map((s) => s.split(";")[0])
        .join("; ")

      const pick = await fetch(`${EMULATE_GITHUB}/login/oauth/callback`, {
        method: "POST",
        body: new URLSearchParams({
          login: userLogin,
          redirect_uri: redirectUri,
          scope: "read:user user:email",
          state,
          client_id: clientId,
        }),
        redirect: "manual",
      })
      const callback = pick.headers.get("location")
      if (!callback) return fail("emulator picker did not redirect")
      const code = new URL(callback).searchParams.get("code")
      if (!code) return fail("emulator did not return a code")

      const cb = await oAuth2Callback({
        query: { code, state },
        params: { providerId: EMULATE_PROVIDER_ID },
        headers: new Headers({ cookie: stateCookie }),
        asResponse: true,
      })
      const setCookies = cb.headers.getSetCookie()
      if (!setCookies.some((s) => s.includes("session_token"))) {
        return fail(`session not created (callback status ${cb.status})`)
      }
      for (const sc of setCookies) c.header("Set-Cookie", sc, { append: true })
      return c.redirect(`${APP_URL}/dashboard`, 302)
    })
