import { reachesConsole, type ConsoleRole } from "@packages/auth/access"
import { notFound } from "next/navigation"
import { cache } from "react"

import { auth } from "@/lib/auth"

// Single source of truth for console access: the platform role ladder (Better Auth Admin plugin's `role` column), read through the shared rank predicate. Member and above may look; the API decides what they may change. Shared by the layout guard and the gated search route so the rule can't drift.
// Cached per render pass: the layout and the page both gate, and without this each console page costs two uncached session reads, which are HTTP round trips from the web to the API.
export const getConsoleSession = cache(async () => {
  // Bypass the session cookie cache so a grant/revoke takes effect on the next request rather than after the cache window.
  const session = await auth.api.getSession({ disableCookieCache: true })
  // banned as well as role: a ban deletes the person's sessions, but one written straight to the database would otherwise still open the console onto an API that 403s every request.
  if (!session || !reachesConsole(session.user)) return null
  return session
})

// Server-side guard for /console: notFound() (never a redirect) for anyone below the required rung. Layouts and pages render in parallel, so a page needing more than the layout's member must say so itself.
export async function assertConsoleAccess(minimum: ConsoleRole = "member") {
  const session = await getConsoleSession()
  if (!session || !reachesConsole(session.user, minimum)) {
    notFound()
  }
  return session
}
