import type { BunSQLDatabase } from "drizzle-orm/bun-sql"

import { env } from "@packages/env/db"
import { SQL } from "bun"
import { drizzle } from "drizzle-orm/bun-sql"

import * as schema from "@/schema"

type Database = BunSQLDatabase<typeof schema>

declare global {
  var db: Database
}

let db: Database

if (env.NODE_ENV === "production") {
  const client = new SQL(env.POSTGRES_URL, {
    connectionTimeout: 10,
    idleTimeout: 30,
    maxLifetime: 0,
    tls: {
      rejectUnauthorized: true,
    },
  })
  db = drizzle({ client, schema })
} else {
  if (!global.db) {
    const client = new SQL(env.POSTGRES_URL, {
      connectionTimeout: 10,
      idleTimeout: 30,
      maxLifetime: 0,
    })
    global.db = drizzle({ client, schema })
  }
  db = global.db
}

export { db }
export * from "@/schema"
