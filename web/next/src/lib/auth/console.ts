import { notFound } from "next/navigation"

import { auth } from "@/lib/auth"

/*
 * Server-side guard for the entire /console area.
 *
 * Access is keyed off the user's `console` field: null for normal users, a
 * non-null value (e.g. "admin") for internal users. Calls `notFound()` (a
 * default 404) when the visitor is unauthenticated or has no console access. It
 * never redirects, so an unauthorized visitor cannot tell a protected route
 * from a non-existent one. Returns the session for authorized callers.
 *
 * Note: today any non-null `console` grants full access; there is no per-role
 * check yet (admin === any-non-null).
 *
 * The console layout calls this, which covers rendering of every nested route.
 * But layouts and pages render in parallel on the server, so a page's data
 * fetching still runs even when the layout throws notFound(). Current console
 * pages are safe (the dashboard renders null, docs render static MDX), but any
 * future console page or route handler that reads sensitive data or performs a
 * mutation MUST call assertConsoleAccess() itself; do not rely on the layout
 * gate alone for authorization.
 */
export async function assertConsoleAccess() {
  const session = await auth.api.getSession()

  if (!session?.user?.console) {
    notFound()
  }

  return session
}
