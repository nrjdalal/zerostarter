// Platform access decisions as pure functions: no database, no request, no auth instance, so both apps import them and tests exercise them directly (importing the auth instance throws under CI's dummy secret). Rank ordering lives here alone; a second comparison written inline is how a lower rung quietly gains a power.

// Ordered by rank, not alphabetically: the ladder is the meaning. Distinct from the organization plugin's per-membership roles, which share three of these words and govern nothing here.
export const CONSOLE_ROLES = ["owner", "admin", "member", "user"] as const

export type ConsoleRole = (typeof CONSOLE_ROLES)[number]

const RANK: Record<ConsoleRole, number> = { admin: 2, member: 1, owner: 3, user: 0 }

// hasOwn, not `in`: a crafted "constructor" would otherwise resolve through the prototype chain. Anything unrecognized (null, a legacy value) reads as the lowest rung, so an unknown role can never grant access.
export function consoleRole(role: string | null | undefined): ConsoleRole {
  return role && Object.hasOwn(RANK, role) ? (role as ConsoleRole) : "user"
}

export function roleAtLeast(role: string | null | undefined, minimum: ConsoleRole): boolean {
  return RANK[consoleRole(role)] >= RANK[minimum]
}

// Why a role change was refused, so the API can say it rather than returning a bare failure.
export type RoleChangeRefusal = "last-owner" | "outranked" | "owner-only" | "self" | "unknown-role"

// The rules that keep an install from locking itself out. Whether the target is the last owner is decided by the caller, which is the only part that needs the database, so this stays pure.
export function refuseRoleChange(input: {
  actorRole: string | null | undefined
  isSelf: boolean
  nextRole: string
  targetIsLastOwner: boolean
  targetRole: string | null | undefined
}): RoleChangeRefusal | null {
  const actor = consoleRole(input.actorRole)
  const target = consoleRole(input.targetRole)
  if (!Object.hasOwn(RANK, input.nextRole)) return "unknown-role"
  const next = input.nextRole as ConsoleRole
  // Demoting yourself out of the console is the likeliest accident, so it is refused before anything else.
  if (input.isSelf) return "self"
  if (next === "owner" && actor !== "owner") return "owner-only"
  if (!roleAtLeast(actor, "admin")) return "outranked"
  // An owner may act on anyone, peers included. Everyone else must stay strictly below their own rank on both sides, so two admins cannot demote each other and an admin cannot mint another admin.
  if (actor !== "owner" && (RANK[target] >= RANK[actor] || RANK[next] >= RANK[actor])) {
    return "outranked"
  }
  if (input.targetIsLastOwner && next !== "owner") return "last-owner"
  return null
}
