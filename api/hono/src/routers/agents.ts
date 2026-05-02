import { auth, EMULATE_PROVIDER_ID, EMULATE_URL } from "@packages/auth"
import { isLocal } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { Hono } from "hono"

type EmulateAuthApi = {
  signInWithOAuth2: (input: {
    body: { providerId: string; callbackURL: string }
    asResponse: true
  }) => Promise<Response>
  oAuth2Callback: (input: {
    query: { code: string; state: string }
    params: { providerId: string }
    headers: Headers
    asResponse: true
  }) => Promise<Response>
}

// dts can't see the genericOAuth plugin's API additions: it's added through a
// conditional isLocal spread in packages/auth and BetterAuthPlugin (required by
// tsgo) erases the contributed methods.
const emulateApi = auth.api as unknown as EmulateAuthApi

export const agentsRouter = new Hono()
  .use(async (c, next) => (isLocal(env.NODE_ENV) ? next() : c.notFound()))
  .post("/sign-in-as", async (c) => {
    const fail = (message: string) =>
      c.json({ error: { code: "AGENTS_LOGIN_FAILED", message } }, 500)
    // Trusting Origin is safe only because the router middleware above gates this to local.
    const origin = c.req.header("origin")
    if (!origin) return fail("missing Origin header")
    const dashboardUrl = `${origin}/dashboard`

    const authorize = await emulateApi.signInWithOAuth2({
      body: { providerId: EMULATE_PROVIDER_ID, callbackURL: dashboardUrl },
      asResponse: true,
    })
    const { url: authorizeUrl } = (await authorize.json()) as { url: string }
    // Cookie header is name=value pairs only; getSetCookie() avoids the multi-cookie collapse
    const stateCookie = authorize.headers
      .getSetCookie()
      .map((setCookie) => setCookie.split(";")[0])
      .join("; ")

    const pickerForm = new URL(authorizeUrl).searchParams
    pickerForm.set("login", "AgentZero")
    const pickerResponse = await fetch(`${EMULATE_URL}/login/oauth/callback`, {
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

    const session = await emulateApi.oAuth2Callback({
      query: { code, state },
      params: { providerId: EMULATE_PROVIDER_ID },
      headers: new Headers({ cookie: stateCookie }),
      asResponse: true,
    })
    session.headers
      .getSetCookie()
      .forEach((setCookie) => c.header("Set-Cookie", setCookie, { append: true }))
    return c.redirect(dashboardUrl, 302)
  })
