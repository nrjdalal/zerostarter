import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"
import "./lib/utils"
import { NODE_ENV } from "./lib/constants"

export const env = createEnv({
  server: {
    NODE_ENV,
    INTERNAL_API_URL: z.url().optional(),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_USERJOT_URL: z.url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_USERJOT_URL: process.env.NEXT_PUBLIC_USERJOT_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
})
