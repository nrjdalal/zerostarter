import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { config } from "@/lib/config"

// Finishes the cross-origin session handoff (split deployments only; the api's routes 404 otherwise, so this handler is inert everywhere else). Claims the one-time id server-to-server, then sets the session cookie first-party on this origin so server-rendered pages can read the session. The cookie value is the api's own signed token; a forged value fails the api's signature check on every read, so this route holds no secrets.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const id = requestUrl.searchParams.get("id")
  if (!id) return NextResponse.redirect(new URL("/", requestUrl))

  try {
    const response = await fetch(`${config.api.url}/api/handoff/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
      cache: "no-store",
    })
    if (!response.ok) {
      return NextResponse.redirect(new URL("/?error=handoff_failed", requestUrl))
    }
    const body = (await response.json()) as {
      data?: { name?: string; value?: string; nonce?: string }
    }
    const { name, value, nonce } = body.data ?? {}
    if (!name || !value || !nonce) {
      return NextResponse.redirect(new URL("/?error=handoff_failed", requestUrl))
    }
    // Only the browser that started this sign-in holds the matching nonce cookie; anyone else's claim dies here even with a valid id.
    const jar = await cookies()
    if (jar.get("handoff_nonce")?.value !== nonce) {
      return NextResponse.redirect(new URL("/?error=handoff_failed", requestUrl))
    }

    const redirect = NextResponse.redirect(new URL("/dashboard", requestUrl))
    redirect.cookies.delete("handoff_nonce")
    redirect.cookies.set(name, value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return redirect
  } catch {
    return NextResponse.redirect(new URL("/?error=handoff_failed", requestUrl))
  }
}
