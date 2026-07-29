import type { BunSQLDatabase } from "drizzle-orm/bun-sql"

import type * as schema from "@/schema"

export type Database = BunSQLDatabase<typeof schema>

// The handle inside db.transaction. Named here so a helper can take "the database or a transaction" without every caller spelling the conditional type out.
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0]
