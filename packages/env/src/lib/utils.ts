import { config } from "dotenv"
import path from "node:path"

import { isLocal, NODE_ENV } from "@/lib/constants"

if (typeof window === "undefined") {
  try {
    // Load base .env file
    const envPath = path.resolve(process.cwd(), "../../.env")
    config({ path: envPath, quiet: true })

    // Load environment-specific .env file if NODE_ENV is set
    const nodeEnv = process.env.NODE_ENV
    if (nodeEnv && NODE_ENV.safeParse(nodeEnv).success) {
      const envSpecificPath = path.resolve(process.cwd(), `../../.env.${nodeEnv}`)
      config({ path: envSpecificPath, override: true, quiet: true })
    }
  } catch (e) {
    console.error(e)
  }
}

export const getSafeEnv = (env: Record<string, unknown>, appName?: string) => {
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
  // Only log in local environment
  if (isLocal(process.env.NODE_ENV)) {
    console.log(`${appName ?? "@packages/env"}:getSafeEnv:`, result)
  }
  return result
}
