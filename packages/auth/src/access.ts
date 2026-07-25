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
