import { notFound } from "next/navigation"

import { auth } from "@/lib/auth"

/*
 * Single source of truth for "who may use the console". Returns the session
 * when the user has console access, otherwise null.
 *
 * Access is keyed off the user's `console` field: null (the default) for normal
 * users, a non-empty value (e.g. "admin") for internal users. The check is
 * fail-closed, so null, undefined, and "" are all denied. Today any non-empty
 * value grants full access; there is no per-role check yet.
 *
 * Shared by the layout guard and the gated console search route so the rule
 * cannot drift between them.
 */
export async function getConsoleSession() {
  const session = await auth.api.getSession()
  return session?.user?.console ? session : null
}

/*
 * Server-side guard for the entire /console area. Calls `notFound()` (a default
 * 404) for visitors without console access; it never redirects, so a protected
 * route is indistinguishable from a non-existent one. Returns the session for
 * authorized callers.
 *
 * The console layout calls this, which covers rendering of every nested route.
 * But layouts and pages render in parallel on the server, so a page's data
 * fetching still runs even when the layout throws notFound(). Current console
 * pages are safe (the dashboard renders null, docs render static MDX), but any
 * future console page or route handler that reads sensitive data or performs a
 * mutation MUST gate itself (assertConsoleAccess / getConsoleSession); do not
 * rely on the layout gate alone for authorization.
 */
export async function assertConsoleAccess() {
  const session = await getConsoleSession()
  if (!session) {
    notFound()
  }
  return session
}
