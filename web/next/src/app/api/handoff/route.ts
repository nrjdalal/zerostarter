import { HANDOFF_NONCE_COOKIE } from "@packages/config/deploy"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { apiClient, unwrap } from "@/lib/api/client"

// The claim route acts only in split mode, matching the api's handoff gate; the split decision is a build-time constant (NEXT_PUBLIC_SPLIT_AUTH).
const splitPair = process.env.NEXT_PUBLIC_SPLIT_AUTH === "true"

// Finishes the cross-origin session handoff (split deployments only; the api's routes 404 otherwise, so this handler is inert everywhere else). Claims the one-time id server-to-server through the typed api client, presenting this browser's nonce so the api verifies only the initiating browser redeems it, then sets the session cookie first-party on this origin so server-rendered pages can read the session. The cookie value is the api's own signed token; a forged value fails the api's signature check on every read, so this route holds no secrets.
export async function GET(request: Request) {
  if (!splitPair) return new NextResponse(null, { status: 404 })
  const requestUrl = new URL(request.url)
  const id = requestUrl.searchParams.get("id")
  const jar = await cookies()
  const nonceCookie = jar.get(HANDOFF_NONCE_COOKIE)
  const nonce = nonceCookie ? nonceCookie.value : null

  // Every failure ends the same way: back to home. The nonce is left in place, not cleared: two tabs share this one cookie (last write wins), so clearing on failure would nuke a concurrent sign-in's live nonce. Lingering is harmless, it is Max-Age bounded and useless without a matching parked row, and the success path below always clears it.
  const fail = () => NextResponse.redirect(new URL("/", requestUrl))

  if (!id || !nonce) return fail()

  const { data, error } = await unwrap(apiClient.handoff.claim.$post({ json: { id, nonce } }))
  if (error) return fail()
  const { name, value, expiresAt } = data
  if (!name || !value || !expiresAt) return fail()

  // Match the cookie lifetime to the api session's real expiry rather than a hardcoded window, so the first-party copy expires exactly when the source session does. A malformed expiresAt yields NaN, which the cookie serializer rejects with a 500, so bail if it is not finite.
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  if (!Number.isFinite(maxAge)) return fail()
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
