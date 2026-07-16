import { HANDOFF_NONCE_COOKIE } from "@packages/config/deploy"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { apiClient, unwrap } from "@/lib/api/client"

// Finishes the cross-origin session handoff (split deployments only; the api's routes 404 otherwise, so this handler is inert everywhere else). Claims the one-time id server-to-server through the typed api client, presenting this browser's nonce so the api verifies only the initiating browser redeems it, then sets the session cookie first-party on this origin so server-rendered pages can read the session. The cookie value is the api's own signed token; a forged value fails the api's signature check on every read, so this route holds no secrets.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const id = requestUrl.searchParams.get("id")
  const jar = await cookies()
  const nonceCookie = jar.get(HANDOFF_NONCE_COOKIE)
  const nonce = nonceCookie ? nonceCookie.value : null

  // Every failure ends the same way: back to home with a flag, and the one-time nonce cleared so it cannot linger.
  const fail = () => {
    const failed = NextResponse.redirect(new URL("/?error=handoff_failed", requestUrl))
    failed.cookies.delete(HANDOFF_NONCE_COOKIE)
    return failed
  }

  if (!id || !nonce) return fail()

  const { data, error } = await unwrap(apiClient.handoff.claim.$post({ json: { id, nonce } }))
  if (error) return fail()
  const { name, value, expiresAt } = data
  if (!name || !value || !expiresAt) return fail()

  // Match the cookie lifetime to the api session's real expiry rather than a hardcoded window, so the first-party copy expires exactly when the source session does.
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  const redirect = NextResponse.redirect(new URL("/dashboard", requestUrl))
  redirect.cookies.delete(HANDOFF_NONCE_COOKIE)
  redirect.cookies.set(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  })
  return redirect
}
