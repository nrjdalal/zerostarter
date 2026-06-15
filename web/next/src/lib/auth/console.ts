import { notFound } from "next/navigation"

import { auth } from "@/lib/auth"

/*
 * Server-side guard for the entire /console area.
 *
 * Access is keyed off the user's `console` field: it is null for normal users
 * and a non-null value (e.g. "admin") for internal users. Calls `notFound()`
 * (a default 404) when the visitor is unauthenticated or has no console access.
 * It never redirects, so an unauthorized visitor cannot distinguish a protected
 * route from one that does not exist. Returns the session for authorized callers.
 */
export async function assertConsoleAccess() {
  const session = await auth.api.getSession()

  if (!session?.user?.console) {
    notFound()
  }

  return session
}
