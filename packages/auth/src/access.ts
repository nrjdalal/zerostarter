// Platform access decisions as pure functions: no database, no request, no auth instance, so both apps import them and tests exercise them directly. Rank ordering lives here alone, because a second comparison written inline is how a lower rung quietly gains a power.

// Ordered by rank, not alphabetically: the ladder is the meaning. Distinct from the organization plugin's per-membership roles, which share three of these words and govern nothing here.
export const CONSOLE_ROLES = ["owner", "admin", "member", "user"] as const

export type ConsoleRole = (typeof CONSOLE_ROLES)[number]

// Derived from the array above, so the ordering really does live in one place: the last rung scores 0 and every step up adds one.
const RANK = Object.fromEntries(
  CONSOLE_ROLES.map((role, index) => [role, CONSOLE_ROLES.length - 1 - index]),
) as Record<ConsoleRole, number>

// hasOwn, not `in`: a crafted "constructor" would otherwise resolve through the prototype chain. Anything unrecognized (null, a legacy value) reads as the lowest rung, so an unknown role can never grant access.
export function consoleRole(role: string | null | undefined): ConsoleRole {
  return role && Object.hasOwn(RANK, role) ? (role as ConsoleRole) : "user"
}

export function roleAtLeast(role: string | null | undefined, minimum: ConsoleRole): boolean {
  return RANK[consoleRole(role)] >= RANK[minimum]
}

// The rung and the ban together. A ban written straight to the database leaves the rung intact, so anything asking the rung alone opens a door the gates refuse.
export function reachesConsole(
  user: { banned?: boolean | null; role?: string | null },
  minimum: ConsoleRole = "member",
): boolean {
  return roleAtLeast(user.role, minimum) && !user.banned
}

// The rung that may change who reaches the console, named once because six surfaces assert it.
export const ACCESS_ROLE: ConsoleRole = "admin"

// The comparison the header warns about, written once. Every rule asking whether an actor may act on a target asks here.
function outranks(actor: ConsoleRole, target: ConsoleRole): boolean {
  return actor === "owner" || RANK[actor] > RANK[target]
}

// Who is acting and on whom, the pair every guard below needs.
export type ActorTarget = {
  actorRole: string | null | undefined
  isSelf: boolean
  targetRole: string | null | undefined
}

// Why a ban or unban was refused. No last-owner case: banning yourself is already refused, so an owner can only ban an owner while another owner (the actor) remains.
export type BanRefusal = "outranked" | "self"

// The same rank rule as a role change, minus the parts that are about roles. Unbanning is guarded identically, so nobody can lift a ban they could not have applied.
export function refuseBan(input: ActorTarget): BanRefusal | null {
  const actor = consoleRole(input.actorRole)
  if (input.isSelf) return "self"
  if (!roleAtLeast(actor, "admin")) return "outranked"
  if (!outranks(actor, consoleRole(input.targetRole))) return "outranked"
  return null
}

// The rungs this actor could grant this target, from the same guard the API asks, so a menu cannot offer what the server would refuse. targetIsLastOwner is unknowable without the database, so a demotion it refuses can still be offered.
export function grantableRoles(input: ActorTarget): ConsoleRole[] {
  return CONSOLE_ROLES.filter(
    (nextRole) =>
      refuseRoleChange({
        actorRole: input.actorRole,
        isSelf: input.isSelf,
        nextRole,
        targetIsLastOwner: false,
        targetRole: input.targetRole,
      }) === null,
  )
}

// Why a role change was refused, so the API can say it rather than returning a bare failure.
export type RoleChangeRefusal = "last-owner" | "outranked" | "owner-only" | "self" | "unknown-role"

// The rules that keep an install from locking itself out. Whether the target is the last owner is decided by the caller, which is the only part that needs the database, so this stays pure.
export function refuseRoleChange(
  input: ActorTarget & { nextRole: string; targetIsLastOwner: boolean },
): RoleChangeRefusal | null {
  const actor = consoleRole(input.actorRole)
  const target = consoleRole(input.targetRole)
  if (!Object.hasOwn(RANK, input.nextRole)) return "unknown-role"
  const next = input.nextRole as ConsoleRole
  // Demoting yourself out of the console is the likeliest accident, so it is refused before anything else.
  if (input.isSelf) return "self"
  // Rank before the owner-only rule, so someone with no business changing roles at all is told they are outranked rather than being handed the narrower reason as though the rung were the only thing in their way.
  if (!roleAtLeast(actor, "admin")) return "outranked"
  if (next === "owner" && actor !== "owner") return "owner-only"
  // Both sides: an admin can neither act on a peer nor mint one.
  if (!outranks(actor, target) || !outranks(actor, next)) return "outranked"
  if (input.targetIsLastOwner && next !== "owner") return "last-owner"
  return null
}

// Allowlist: who gets console access. Anyone may sign up and use the dashboard; a rule is what lifts someone to the console's bottom rung.

// The kinds a rule can be, in one place: the column's type, both zod enums and the console's facet all derive from it.
export const ALLOWLIST_KINDS = ["domain", "email"] as const

export type AllowlistKind = (typeof ALLOWLIST_KINDS)[number]

export type AllowlistRule = { kind: AllowlistKind; value: string }

// A leading @ is a domain rule, anything else must look like an address. Normalizing here means one shape reaches the database, so a duplicate cannot hide behind different casing.
export function parseAllowlistRule(input: string): AllowlistRule | null {
  const value = input.trim().toLowerCase()
  if (!value || /\s/.test(value)) return null
  if (value.startsWith("@")) {
    const domain = value.slice(1)
    return isDomain(domain) ? { kind: "domain", value } : null
  }
  const at = value.indexOf("@")
  if (at < 1 || at !== value.lastIndexOf("@")) return null
  return isDomain(value.slice(at + 1)) ? { kind: "email", value } : null
}

function isDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)
}

// Which rule grants an address, or undefined for none. An empty list grants nothing: a rule is a grant, so no rules means nobody is lifted, and adding the first one cannot accidentally hand the console to everyone. A domain rule matches its domain exactly, which means a subdomain needs its own rule rather than being covered silently.
// An address rule and a domain rule can both cover the same person. The address rule is the specific one, so it is the one returned, which is what stops the caller naming whichever row the database happened to return first.
export function findAllowlistRule(
  email: string,
  rules: AllowlistRule[],
): AllowlistRule | undefined {
  const address = email.trim().toLowerCase()
  const at = address.lastIndexOf("@")
  if (at < 1) return undefined
  const domain = address.slice(at + 1)
  const covers = (rule: AllowlistRule) =>
    rule.kind === "domain" ? rule.value === `@${domain}` : rule.value === address
  const exact = rules.find((rule) => rule.kind === "email" && covers(rule))
  if (exact) return exact
  return rules.find(covers)
}

export function matchesAllowlist(email: string, rules: AllowlistRule[]): boolean {
  return findAllowlistRule(email, rules) !== undefined
}
