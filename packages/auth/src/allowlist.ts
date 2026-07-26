import { features } from "@packages/config/site"
import { allowlist, db, user } from "@packages/db"
import { and, eq, inArray, isNull, or } from "drizzle-orm"

import { ALLOWLIST_KINDS, matchesAllowlist, roleAtLeast, type AllowlistRule } from "@/access"

// Signing up and using the dashboard is open to everyone; the allowlist is only about the console. A matching address is lifted to the console's bottom rung on sign-in, so adding a domain covers colleagues who already have accounts rather than only future ones.
// Best effort on purpose: this sits on the sign-in path, so a database failure must not stop anyone signing in. A missed grant is repaired by the next sign-in.
export async function grantConsoleAccessOnSignIn(session: {
  impersonatedBy?: string | null
  userId: string
}) {
  if (!features.allowlist) return
  // An impersonation session is an admin acting as someone, not that person signing in, and a grant made from it would outlive the impersonation.
  if (session.impersonatedBy) return
  try {
    // Read through our own schema rather than the adapter: role is our column, added by the admin plugin, and not on Better Auth's base user type.
    const [signingIn] = await db
      .select({
        email: user.email,
        grantedAt: user.allowlistGrantedAt,
        id: user.id,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, session.userId))
      .limit(1)
    // Never lowers anyone, and lifts each account once: re-granting every sign-in would make a demotion revert the next time they signed in.
    if (!signingIn || signingIn.grantedAt || roleAtLeast(signingIn.role, "member")) return
    // Only the two rows that could match, not the table: this runs for every ordinary sign-in and the allowlist has no bound. Values are stored normalized, which is what makes an exact match correct; matchesAllowlist still decides, so the semantics stay in the tested seam.
    const address = signingIn.email.trim().toLowerCase()
    const at = address.lastIndexOf("@")
    if (at < 1) return
    const candidates = await db
      .select({ kind: allowlist.kind, value: allowlist.value })
      .from(allowlist)
      .where(inArray(allowlist.value, [address, address.slice(at)]))
    const rules = candidates.filter((rule): rule is AllowlistRule =>
      ALLOWLIST_KINDS.some((kind) => kind === rule.kind),
    )
    if (!matchesAllowlist(signingIn.email, rules)) return
    // Conditional on both the rung and the marker read above, so two sign-ins racing each other grant once between them.
    await db
      .update(user)
      .set({ allowlistGrantedAt: new Date(), role: "member" })
      .where(
        and(
          eq(user.id, signingIn.id),
          isNull(user.allowlistGrantedAt),
          or(isNull(user.role), eq(user.role, "user")),
        ),
      )
  } catch (error) {
    console.error("allowlist grant failed during sign-in:", error)
  }
}
