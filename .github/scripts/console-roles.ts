import { SQL } from "bun"

// Manage console access by setting the user's platform `role` (Better Auth Admin plugin).
// Usage: bun run console:roles <grant|revoke|list> [email] [role]
//   grant <email> [role]  set the role: owner, admin or member. Defaults to admin, or to owner when the install has none yet, which is how a fresh install gets its first way in.
//   revoke <email>        set role = user (no console)
//   list                  show everyone with console access, by role

const [action, emailArg, roleArg] = process.argv.slice(2)
const email = emailArg?.trim().toLowerCase()

const url = process.env.POSTGRES_URL
if (!url) {
  console.error("POSTGRES_URL is not set (load your .env)")
  process.exit(1)
}

const sql = new SQL(url)

// The ladder's grantable rungs, in rank order; `user` is the absence of console access, which is what revoke sets.
// Restated rather than imported from @packages/auth/access, because this runs from the repo root, where @packages/auth does not resolve. tests/github/scripts/console-roles.test.ts holds this copy to the real one.
const GRANTABLE = ["owner", "admin", "member"]
// The same list and the same order for the database, derived rather than spelled out again. Interpolated as SQL text rather than bound, which is safe only because GRANTABLE is this literal array and never user input.
const GRANTABLE_LIST = GRANTABLE.map((role) => `'${role}'`).join(", ")
const RANK_CASE = GRANTABLE.map((role, index) => `WHEN '${role}' THEN ${index}`).join(" ")

if (action === "list") {
  const rows = (await sql`SELECT email, name, role FROM "user"
    WHERE role IN (${sql.unsafe(GRANTABLE_LIST)})
    ORDER BY CASE role ${sql.unsafe(RANK_CASE)} ELSE ${GRANTABLE.length} END, email`) as {
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
const granted = (roleArg ?? fallback).trim().toLowerCase()
if (action === "grant" && !GRANTABLE.includes(granted)) {
  console.error(`role must be one of ${GRANTABLE.join(", ")}`)
  process.exit(1)
}
if (action === "grant" && owners === 0 && granted !== "owner") {
  console.warn(
    `note: this install has no owner, and ${granted} cannot create one. Run with 'owner' to make the first.`,
  )
}

// Revoking is the way out of the console, and it can take the last owner with it. That state is only recoverable from this script, so it says so on the way out as well as on the way in.
if (action === "revoke" && owners === 1) {
  const [current] = (await sql`SELECT role FROM "user"
    WHERE lower(email) = ${email}`) as [{ role: string | null }?]
  if (current && current.role === "owner") {
    console.warn(
      "note: this is the last owner. Nobody left can grant owner from the console, only this script.",
    )
  }
}

const role = action === "grant" ? granted : "user"
// One transaction, like every other path that changes a rung: the rung and the line recording it commit together, so this script cannot be the one place a change happens unrecorded. Written by hand rather than through recordActivity because this runs from the repo root, where @packages/db does not resolve, so keep the shape in step with packages/db/src/console.ts.
// The read is inside it too, and locks the row, so the from-rung the line reports is the one the update actually replaced.
const rows = await sql.begin(async (tx) => {
  const [before] = (await tx`SELECT role FROM "user"
      WHERE lower(email) = ${email} FOR UPDATE`) as [{ role: string | null }?]
  const updated = (await tx`UPDATE "user" SET role = ${role}, role_set_at = now()
      WHERE lower(email) = ${email} RETURNING email, role`) as {
    email: string
    role: string
  }[]
  if (updated.length > 0) {
    // Three cases, worded exactly as packages/db/src/console.ts words them.
    const summary =
      before?.role === role
        ? `Confirmed ${updated[0].email} at ${role}`
        : before?.role
          ? `Changed ${updated[0].email} from ${before.role} to ${role}`
          : `Set ${updated[0].email} to ${role}`
    await tx`INSERT INTO activity (id, actor, action, summary)
      VALUES (gen_random_uuid()::text, ${"console:roles"}, ${"role.change"}, ${summary})`
  }
  return updated
})

if (rows.length === 0) {
  console.error(`No user found with email ${email}`)
  await sql.end()
  process.exit(1)
}

console.log(`${rows[0].email} -> role: ${rows[0].role}`)
await sql.end()
