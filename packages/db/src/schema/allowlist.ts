import { sql } from "drizzle-orm"
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"

import { user } from "@/schema/auth"

export const allowlist = pgTable("allowlist", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  value: text("value").notNull().unique(),
  kind: text("kind")
    .notNull()
    .generatedAlwaysAs(sql`case when "value" like '@%' then 'domain' else 'email' end`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
})
