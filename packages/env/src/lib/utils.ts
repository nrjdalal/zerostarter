import path from "node:path"
import { config } from "dotenv"

if (typeof window === "undefined") {
  try {
    config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true })
  } catch (e) {
    console.error(e)
  }
}

export const getSafeEnv = (env: Record<string, unknown>) => {
  const redactKeys = [
    "database_url",
    "db_url",
    "key",
    "password",
    "postgres_url",
    "secret",
    "token",
  ]

  const result = Object.fromEntries(
    Object.entries(env).map(([key, value]) => {
      const isRedacted = redactKeys.some((redactKey) =>
        key.toLowerCase().includes(redactKey.toLowerCase()),
      )
      if (isRedacted) {
        return [key, "******** REDACTED ********"]
      }
      return [key, value]
    }),
  )
  // Only log in development mode
  if (process.env.NODE_ENV === "development") {
    console.log("@packages/env:getSafeEnv:", result)
  }
  return result
}
