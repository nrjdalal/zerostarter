import { SQL } from "bun"

// Manage console access by setting the user's platform `role` (Better Auth Admin plugin).
// Usage: bun run console:roles <grant|revoke|list> [email] [role]
//   grant <email> [role]  set the role: owner, admin or member. Defaults to admin, or to owner when the install has none yet, which is how a fresh install gets its first way in.
//   revoke <email>        set role = user (no console)
//   list                  show everyone with console access, by role

const [action, emailArg] = process.argv.slice(2)
const email = emailArg?.trim().toLowerCase()

const url = process.env.POSTGRES_URL
if (!url) {
  console.error("POSTGRES_URL is not set (load your .env)")
  process.exit(1)
}

const sql = new SQL(url)

// Rank order, matching the ladder in @packages/auth; `user` is the absence of console access and is what revoke sets.
const CONSOLE_ROLES = ["owner", "admin", "member"]

if (action === "list") {
  const rows = (await sql`SELECT email, name, role FROM "user"
    WHERE role IN ('owner', 'admin', 'member')
    ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, email`) as {
    email: string
    name: string
    role: string
  }[]
  console.log(
    rows.length
      ? rows.map((r) => `- ${r.role.padEnd(6)} ${r.email} (${r.name})`).join("\n")
      : "(nobody has console access)",
  )
  await sql.end()
  process.exit(0)
}

if ((action !== "grant" && action !== "revoke") || !email) {
  console.error("usage: bun run console:roles <grant|revoke|list> [email] [role]")
  process.exit(1)
}

// An install with no owner is a trap: an admin cannot grant owner (owner-only), cannot act on a peer (outranked), and cannot unban another admin, so the only way back in is this script. When no owner exists yet, an unqualified grant makes one rather than quietly creating that state.
const [{ count: owners }] = (await sql`SELECT count(*)::int AS count FROM "user"
  WHERE role = 'owner'`) as [{ count: number }]
const fallback = owners === 0 ? "owner" : "admin"
const granted = (process.argv[4] ?? fallback).trim().toLowerCase()
if (action === "grant" && !CONSOLE_ROLES.includes(granted)) {
  console.error(`role must be one of ${CONSOLE_ROLES.join(", ")}`)
  process.exit(1)
}
if (action === "grant" && owners === 0 && granted !== "owner") {
  console.warn(
    `note: this install has no owner, and ${granted} cannot create one. Run with 'owner' to make the first.`,
  )
}

const role = action === "grant" ? granted : "user"
const rows =
  (await sql`UPDATE "user" SET role = ${role} WHERE lower(email) = ${email} RETURNING email, role`) as {
    email: string
    role: string
  }[]

if (rows.length === 0) {
  console.error(`No user found with email ${email}`)
  await sql.end()
  process.exit(1)
}

console.log(`${rows[0].email} -> role: ${rows[0].role}`)
await sql.end()
