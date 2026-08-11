import { isLocal } from "@/lib/constants"

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
