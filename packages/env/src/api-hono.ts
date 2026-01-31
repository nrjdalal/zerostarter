import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import "@/lib/utils"
import { NODE_ENV } from "@/lib/constants"

export const env = createEnv({
  server: {
    NODE_ENV,
    HONO_APP_URL: z.url(),
    HONO_PORT: z.coerce.number().default(4000),
    HONO_RATE_LIMIT: z.coerce.number().default(60),
    HONO_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
    HONO_TRUSTED_ORIGINS: z
      .string()
      .transform((s) => s.split(",").map((v) => v.trim()))
      .pipe(z.array(z.url())),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    HONO_APP_URL: process.env.HONO_APP_URL,
    HONO_PORT: process.env.HONO_PORT,
    HONO_RATE_LIMIT: process.env.HONO_RATE_LIMIT,
    HONO_RATE_LIMIT_WINDOW_MS: process.env.HONO_RATE_LIMIT_WINDOW_MS,
    HONO_TRUSTED_ORIGINS: process.env.HONO_TRUSTED_ORIGINS,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
})
