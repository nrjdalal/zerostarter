import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import "@/lib/utils"
import { NODE_ENV } from "@/lib/constants"
import { polyfillServer } from "@/lib/polyfill"

export const env = createEnv({
  server: {
    NODE_ENV,
    // Gates the local-only agent sign-in route. Unset by default; a fork sets it deliberately in dev to enable agent login, and must leave it unset everywhere else. No polyfill: it is optional, so a build passes without it, and the route stays unmounted.
    AGENT_AUTH_SECRET: z.string().min(1).optional(),
    HONO_APP_URL: z.url(),
    HONO_PORT: z.coerce.number().default(4000),
    HONO_RATE_LIMIT: z.coerce.number().default(60),
    HONO_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
    HONO_TRUSTED_ORIGINS: z
      .string()
      .transform((s) => s.split(",").map((v) => v.trim().replace(/\/$/, "")))
      .pipe(z.array(z.url())),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    AGENT_AUTH_SECRET: process.env.AGENT_AUTH_SECRET,
    HONO_APP_URL: polyfillServer(process.env.HONO_APP_URL, "https://polyfill.url"),
    HONO_PORT: process.env.HONO_PORT,
    HONO_RATE_LIMIT: process.env.HONO_RATE_LIMIT,
    HONO_RATE_LIMIT_WINDOW_MS: process.env.HONO_RATE_LIMIT_WINDOW_MS,
    HONO_TRUSTED_ORIGINS: polyfillServer(process.env.HONO_TRUSTED_ORIGINS, "https://polyfill.url"),
  },
  emptyStringAsUndefined: true,
})
