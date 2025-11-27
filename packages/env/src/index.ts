import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

if (typeof window === "undefined") {
  try {
    const path = require("path")
    require("dotenv").config({ path: path.resolve(process.cwd(), "../../.env") })
  } catch (e) {
    console.error(e)
  }
}

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    BETTER_AUTH_SECRET: z.string().default("openssl rand -base64 32"),
    GITHUB_CLIENT_ID: z.string().default("https://github.com/settings/developers"),
    GITHUB_CLIENT_SECRET: z.string().default("https://github.com/settings/developers"),
    HONO_PUBLIC_APP_URL: z.url().default("http://localhost:4000"),
    HONO_PUBLIC_ORIGINS: z
      .string()
      .default("http://localhost:3000")
      .transform((s) => s.split(",")),
    POSTGRES_URL: z.url().default("postgresql://postgres:postgres@localhost:5432/postgres"),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_API_URL: z.url().default("http://localhost:4000"),
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
