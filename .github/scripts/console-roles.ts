import { SQL } from "bun"

// Manage console access by setting the user's `role` (Better Auth Admin plugin).
// Usage: bun run console:roles <grant|revoke|list> [email]
//   grant <email>   set role = admin   (console access)
//   revoke <email>  set role = user    (revoke access)
//   list            show current admins

const [action, emailArg] = process.argv.slice(2)
const email = emailArg?.trim().toLowerCase()

const url = process.env.POSTGRES_URL
if (!url) {
  console.error("POSTGRES_URL is not set (load your .env)")
  process.exit(1)
}

const sql = new SQL(url)

if (action === "list") {
  const rows = (await sql`SELECT email, name FROM "user" WHERE role = 'admin' ORDER BY email`) as {
    email: string
    name: string
  }[]
  console.log(
    rows.length ? rows.map((r) => `- ${r.email} (${r.name})`).join("\n") : "(no console admins)",
  )
  await sql.end()
  process.exit(0)
}

if ((action !== "grant" && action !== "revoke") || !email) {
  console.error("usage: bun run console:roles <grant|revoke|list> [email]")
  process.exit(1)
}

const role = action === "grant" ? "admin" : "user"
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
