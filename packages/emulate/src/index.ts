import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { genericOAuth } from "better-auth/plugins"
import { Hono } from "hono"

export const EMULATE_PROVIDER_ID = "github-emulate"
const EMULATE_GITHUB = "http://localhost:4001"

export const emulateOAuthConfig = (creds: { clientId: string; clientSecret: string }) =>
  genericOAuth({
    config: [
      {
        providerId: EMULATE_PROVIDER_ID,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        authorizationUrl: `${EMULATE_GITHUB}/login/oauth/authorize`,
        tokenUrl: `${EMULATE_GITHUB}/login/oauth/access_token`,
        userInfoUrl: `${EMULATE_GITHUB}/user`,
        scopes: ["user", "repo"],
        pkce: false,
        mapProfileToUser: (p) => ({
          name: p.name ?? p.login,
          email: p.email,
          image: p.avatar_url,
        }),
      },
    ],
  })

export const agentsRouter = new Hono()
  .use(async (c, next) => {
    if (!isLocal(env.NODE_ENV)) {
      return c.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, 403)
    }
    return next()
  })
  .post("/sign-in-as", async (c) => {
    const fail = (message: string) =>
      c.json({ error: { code: "AGENTS_LOGIN_FAILED", message } }, 500)

    const userLogin = c.req.query("user") ?? (await c.req.json().catch(() => ({}))).user ?? "agent"

    const APP_URL = env.HONO_TRUSTED_ORIGINS[0]
    const r1 = await fetch(`${env.HONO_APP_URL}/api/auth/sign-in/oauth2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: EMULATE_PROVIDER_ID,
        callbackURL: `${APP_URL}/dashboard`,
      }),
    })
    const { url } = (await r1.json()) as { url?: string }
    if (!url) return fail("no authorize url from better-auth")
    const params = new URL(url).searchParams
    const state = params.get("state")
    const clientId = params.get("client_id")
    const redirectUri = params.get("redirect_uri")
    if (!state || !clientId || !redirectUri) return fail("malformed authorize url")
    const stateCookie = (r1.headers.get("set-cookie") ?? "").split(";")[0]

    const r2 = await fetch(`${EMULATE_GITHUB}/login/oauth/callback`, {
      method: "POST",
      body: new URLSearchParams({
        login: userLogin,
        redirect_uri: redirectUri,
        scope: "user repo",
        state,
        client_id: clientId,
      }),
      redirect: "manual",
    })
    const callback = r2.headers.get("location")
    if (!callback) return fail("emulator picker did not redirect")

    const r3 = await fetch(callback, { redirect: "manual", headers: { cookie: stateCookie } })
    const setCookies = r3.headers.getSetCookie()
    if (!setCookies.some((sc) => sc.includes("session_token"))) {
      return fail(`session not created (callback status ${r3.status})`)
    }
    for (const sc of setCookies) c.header("Set-Cookie", sc, { append: true })
    return c.redirect(`${APP_URL}/dashboard`, 302)
  })
