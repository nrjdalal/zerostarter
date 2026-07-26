import { sql } from "drizzle-orm"
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { user } from "@/schema/auth"

// Both tables exist only for the console, so they share a file the way the Better Auth tables share auth.ts.
// They also share a shape: actorId links to the person, actor is the text to fall back on. The list resolves actorId to a current email, so a rename shows the new address, and the text only surfaces when there is nobody left to ask: a deleted account, or something that was never a person at all.
// Not userId and user, however generic that reads. "user" is reserved in Postgres: the column cannot be declared unquoted, and `select user from t` silently returns the database role instead of the column, which is a trap for the raw SQL in console-roles.ts.

// Who reaches the console: each row is a domain rule ("@example.com") or a single address, and a matching person is lifted to member on their next sign-in. An empty table grants nothing, so a rule is always a deliberate grant, and removing one stops future grants without demoting anyone.
export const allowlist = pgTable("allowlist", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  // Null only for a rule seeded outside the console, which is what lets the list tell that apart from an author who has since been deleted.
  actor: text("actor"),
  value: text("value").notNull().unique(),
  // Derived, never written: the console filters and sorts on it in SQL, and generating it means it cannot disagree with the value it describes.
  kind: text("kind")
    .notNull()
    .generatedAlwaysAs(sql`case when "value" like '@%' then 'domain' else 'email' end`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// What the console did, and who did it. Append only: nothing here is ever updated, so a row is a fact about a moment rather than a mutable record.
// Called activity rather than an audit log on purpose: an audit log promises completeness, retention and tamper-evidence, and this is a readable trail of console writes.
export const activity = pgTable("activity", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Null whenever no person acted: an allowlist rule granting on sign-in, or console:roles, which has no session.
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  actor: text("actor").notNull(),
  // A code, not a sentence, so the list can filter by it.
  action: text("action").notNull(),
  // What the row is about once you know the action: an email, a rule, a rung change.
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
