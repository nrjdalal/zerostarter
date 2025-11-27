import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default("http://localhost:4000"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
})

export const env = envSchema.parse(process.env)
