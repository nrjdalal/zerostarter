import { env } from "@packages/env"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: env.POSTGRES_URL,
  },
  schema: "src/schema",
  out: "drizzle",
})
