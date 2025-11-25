import { NextRequest, NextResponse } from "next/server"

import { getSessionCookie } from "better-auth/cookies"

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/x"],
}
