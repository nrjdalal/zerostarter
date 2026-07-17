import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import "@/lib/utils"
import { NODE_ENV } from "@/lib/constants"
import { polyfillServer, serverSecret } from "@/lib/polyfill"

export const env = createEnv({
  server: {
    NODE_ENV,
    BETTER_AUTH_SECRET: serverSecret(z.string().min(1)),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    HONO_APP_URL: z.url(),
    HONO_TRUSTED_ORIGINS: z
      .string()
      .transform((s) => s.split(",").map((v) => v.trim().replace(/\/$/, "")))
      .pipe(z.array(z.url())),
    // The keys below are auto-derived, never set by hand, and deliberately absent from .env.example.
    // The api's parent cookie domain, baked into the bundle by tsdown at build (see @packages/env/deploy); unset when running from source, where auth derives the same string itself.
    COOKIE_DOMAIN: z.string().startsWith(".").optional(),
    // The Public Suffix List's verdict on COOKIE_DOMAIN, the one fact a runtime cannot compute: true means browsers reject a Domain cookie there and sign-in must cross origins. Setting it in .env is a dev-only escape hatch to force cross-site behavior from source.
    COOKIE_DOMAIN_PUBLIC_SUFFIX: z.stringbool().default(false),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    HONO_APP_URL: polyfillServer(process.env.HONO_APP_URL, "https://polyfill.url"),
    HONO_TRUSTED_ORIGINS: polyfillServer(process.env.HONO_TRUSTED_ORIGINS, "https://polyfill.url"),
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    COOKIE_DOMAIN_PUBLIC_SUFFIX: process.env.COOKIE_DOMAIN_PUBLIC_SUFFIX,
  },
  emptyStringAsUndefined: true,
})
