import { features } from "@packages/config/site"
import { allowlist, db, recordActivity, roleChangeSummary, user } from "@packages/db"
import { and, eq, inArray, isNull, or } from "drizzle-orm"

import { ALLOWLIST_KINDS, findAllowlistRule, roleAtLeast, type AllowlistRule } from "@/access"

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
        emailVerified: user.emailVerified,
        id: user.id,
        role: user.role,
        roleSetAt: user.roleSetAt,
      })
      .from(user)
      .where(eq(user.id, session.userId))
      .limit(1)
    // Only an account nobody has decided about. roleSetAt is stamped by every deliberate rung change, by a rule or by a person, so a demotion is never undone by the next sign-in and a rule never overrules an admin.
    if (!signingIn || signingIn.roleSetAt || roleAtLeast(signingIn.role, "member")) return
    // A rule matches an address, so the address has to be proven. Every provider shipped here verifies it, and a fork that adds one which does not will see grants stop rather than hand the console to anyone who can type the domain: a loud silence beats a silent escalation.
    if (!signingIn.emailVerified) return
    // Only the two rows that could match, not the table: this runs for every ordinary sign-in and the allowlist has no bound. Values are stored normalized, which is what makes an exact match correct; findAllowlistRule still decides, so the semantics stay in the tested seam.
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
    // The rule that grants it, so the activity row can name the policy rather than a person: nobody acted here. Asked of the tested seam, which also decides which rule wins when an address and a domain rule both cover someone.
    const matched = findAllowlistRule(signingIn.email, rules)
    if (!matched) return
    await db.transaction(async (tx) => {
      // Conditional on both the rung and the marker read above, so two sign-ins racing each other grant once between them.
      const [granted] = await tx
        .update(user)
        .set({ role: "member", roleSetAt: new Date() })
        .where(
          and(
            eq(user.id, signingIn.id),
            isNull(user.roleSetAt),
            or(isNull(user.role), eq(user.role, "user")),
          ),
        )
        .returning({ email: user.email })
      // Nothing to record when the qual matched nothing, which is the racing sign-in that lost.
      if (!granted) return
      await recordActivity(tx, {
        action: "role.change",
        actor: { label: `Allowlist rule ${matched.value}` },
        summary: roleChangeSummary(granted.email, signingIn.role, "member"),
      })
    })
  } catch (error) {
    console.error("allowlist grant failed during sign-in:", error)
  }
}
