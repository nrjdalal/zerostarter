import { notFound } from "next/navigation"

import { auth } from "@/lib/auth"

// Single source of truth for console access (fail-closed on the user's `console` field); shared by the layout guard and the gated search route so the rule can't drift.
export async function getConsoleSession() {
  const session = await auth.api.getSession()
  return session?.user?.console ? session : null
}

// Server-side guard for /console: notFound() (never a redirect) for users without access. Layouts and pages render in parallel, so any console page reading sensitive data must gate itself too.
export async function assertConsoleAccess() {
  const session = await getConsoleSession()
  if (!session) {
    notFound()
  }
  return session
}
