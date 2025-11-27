import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  BETTER_AUTH_SECRET: z.string().min(1),
  HONO_PUBLIC_APP_URL: z.url().default("http://localhost:4000"),
  HONO_PUBLIC_ORIGINS: z
    .string()
    .transform((s) => s.split(","))
    .default(["http://localhost:3000"]),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  POSTGRES_URL: z.url(),
})

export const env = envSchema.parse(process.env)
