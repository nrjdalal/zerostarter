import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import "@/load-dotenv"
import { NODE_ENV } from "@/lib/constants"
import { polyfillServer } from "@/lib/polyfill"
import { dockerHostUrl } from "@/lib/postgres-url"

export const env = createEnv({
  server: {
    NODE_ENV,
    POSTGRES_URL: z.url(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_URL: polyfillServer(
      process.env.INTERNAL_API_URL
        ? dockerHostUrl(process.env.POSTGRES_URL)
        : process.env.POSTGRES_URL,
      "postgres://polyfill.local:5432/db",
    ),
  },
  emptyStringAsUndefined: true,
})
