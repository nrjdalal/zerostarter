import { notFound } from "next/navigation"

import { auth } from "@/lib/auth"

// Single source of truth for console access: the user's `admin` role (Better Auth Admin plugin). Shared by the layout guard and the gated search route so the rule can't drift.
export async function getConsoleSession() {
  // Bypass the session cookie cache so a grant/revoke takes effect on the next request rather than after the cache window.
  const session = await auth.api.getSession({ disableCookieCache: true })
  // banned as well as role: Better Auth's banUser deletes sessions, but a ban written straight to the database would otherwise still open the console onto an API that 403s every request.
  if (!session || session.user.role !== "admin" || session.user.banned) return null
  return session
}

// Server-side guard for /console: notFound() (never a redirect) for users without access. Layouts and pages render in parallel, so any console page reading sensitive data must gate itself too.
export async function assertConsoleAccess() {
  const session = await getConsoleSession()
  if (!session) {
    notFound()
  }
  return session
}
