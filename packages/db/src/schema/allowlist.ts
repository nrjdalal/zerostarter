import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { user } from "@/schema/auth"

// Who reaches the console: each row is a domain rule ("@example.com") or a single address, and a matching person is lifted to member on their next sign-in. An empty table grants nothing, so a rule is always a deliberate grant, and removing one stops future grants without demoting anyone.
export const allowlist = pgTable(
  "allowlist",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Normalized lowercase by @packages/auth/access before it reaches here, so a duplicate cannot hide behind different casing.
    value: text("value").notNull().unique(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // Null for a rule seeded outside the console, so history never blocks a delete.
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [index("allowlist_createdBy_idx").on(table.createdBy)],
)
