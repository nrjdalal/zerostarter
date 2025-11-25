import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"

declare global {
  var db: PostgresJsDatabase
}

let db: PostgresJsDatabase

if (process.env.NODE_ENV === "production") {
  db = drizzle({
    client: postgres(process.env.POSTGRES_URL!, {
      connect_timeout: 10000,
      idle_timeout: 30000,
      ssl: {
        rejectUnauthorized: true,
      },
    }),
  })
} else {
  if (!global.db) {
    global.db = drizzle({
      client: postgres(process.env.POSTGRES_URL!, {
        connect_timeout: 10000,
        idle_timeout: 30000,
      }),
    })
  }
  db = global.db
}

export { db }
