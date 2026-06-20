import { env } from "@packages/env/web-next"
import { notFound } from "next/navigation"

import { auth } from "@/lib/auth"

// Single source of truth for console access; shared by the layout guard and the gated search route so the rule can't drift.
// Access is granted to the `admin` role (dashboard-assigned) or to a bootstrap root admin listed in CONSOLE_ADMIN_EMAILS.
// The check runs only here (on the already-loaded session), so normal logins never pay for it.
export async function getConsoleSession() {
  // Bypass the session cookie cache so a role change takes effect immediately on this privileged gate.
  const session = await auth.api.getSession({ disableCookieCache: true })
  const user = session?.user
  if (!user) return null
  if (user.role === "admin") return session
  if (user.emailVerified && env.CONSOLE_ADMIN_EMAILS.includes(user.email.toLowerCase()))
    return session
  return null
}

// Server-side guard for /console: notFound() (never a redirect) for users without access. Layouts and pages render in parallel, so any console page reading sensitive data must gate itself too.
export async function assertConsoleAccess() {
  const session = await getConsoleSession()
  if (!session) {
    notFound()
  }
  return session
}
