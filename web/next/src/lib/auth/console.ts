import { notFound } from "next/navigation"

import { auth } from "@/lib/auth"

// Single source of truth for console access: the user's `admin` role (Better Auth Admin plugin). Shared by the layout guard and the gated search route so the rule can't drift.
export async function getConsoleSession() {
  // Bypass the session cookie cache so a grant/revoke takes effect on the next request rather than after the cache window.
  const session = await auth.api.getSession({ disableCookieCache: true })
  return session?.user?.role === "admin" ? session : null
}

// Server-side guard for /console: notFound() (never a redirect) for users without access. Layouts and pages render in parallel, so any console page reading sensitive data must gate itself too.
export async function assertConsoleAccess() {
  const session = await getConsoleSession()
  if (!session) {
    notFound()
  }
  return session
}
