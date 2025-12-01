import { createEnv } from "@t3-oss/env-core"
import { config } from "dotenv"
import path from "node:path"
import { z } from "zod"

if (typeof window === "undefined") {
  try {
    config({ path: path.resolve(process.cwd(), "../../.env") })
  } catch (e) {
    console.error(e)
  }
}

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]),
    BETTER_AUTH_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    HONO_APP_URL: z.url(),
    HONO_TRUSTED_ORIGINS: z
      .string()
      .transform((s) => s.split(",").map((v) => v.trim()))
      .pipe(z.array(z.url())),
    INTERNAL_API_URL: z.url().optional(),
    POSTGRES_URL: z.url(),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_API_URL: z.url(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    HONO_APP_URL: process.env.HONO_APP_URL,
    HONO_TRUSTED_ORIGINS: process.env.HONO_TRUSTED_ORIGINS,
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    POSTGRES_URL: process.env.INTERNAL_API_URL
      ? process.env.POSTGRES_URL?.replace("localhost", "host.docker.internal")
      : process.env.POSTGRES_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
})

export const getSafeEnv = () => {
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
  console.log("@packages/env:getSafeEnv:", result)
  return result
}
