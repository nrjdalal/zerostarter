import { env } from "@packages/env/db"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/schema"

type Database = PostgresJsDatabase<typeof schema>

declare global {
  var db: Database
}

let db: Database

if (env.NODE_ENV === "production") {
  const client = postgres(env.POSTGRES_URL, {
    connect_timeout: 10,
    idle_timeout: 30,
    max_lifetime: 0,
    ssl: "require",
  })
  db = drizzle({ client, schema })
} else {
  if (!global.db) {
    const client = postgres(env.POSTGRES_URL, {
      connect_timeout: 10,
      idle_timeout: 30,
      max_lifetime: 0,
    })
    global.db = drizzle({ client, schema })
  }
  db = global.db
}

export { db }
export * from "@/schema"
