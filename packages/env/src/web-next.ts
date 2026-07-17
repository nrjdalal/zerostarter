import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import "@/lib/utils"
import { NODE_ENV } from "@/lib/constants"
import { DEPLOY_MODES } from "@/lib/deploy-modes"
import { polyfillClient } from "@/lib/polyfill"

export const env = createEnv({
  server: {
    NODE_ENV,
    // Auto-derived, never set by hand (absent from .env.example): the internal URL the web server dials instead of the public api origin, injected by Docker compose.
    INTERNAL_API_URL: z.url().optional(),
  },
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().optional(),
    NEXT_PUBLIC_USERJOT_URL: z.url().optional(),
    // The keys below are auto-derived, never set by hand, and deliberately absent from .env.example.
    // Injected by next.config.ts at build from resolveDeployMode (see @packages/env/deploy) and inlined as a literal; optional only because this module also loads while next.config.ts itself is still resolving it.
    NEXT_PUBLIC_DEPLOY_MODE: z.enum(DEPLOY_MODES).optional(),
    // Mirrors NODE_ENV into the client bundle.
    NEXT_PUBLIC_NODE_ENV: NODE_ENV,
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    NEXT_PUBLIC_API_URL: polyfillClient(process.env.NEXT_PUBLIC_API_URL, "https://polyfill.url"),
    NEXT_PUBLIC_APP_URL: polyfillClient(process.env.NEXT_PUBLIC_APP_URL, "https://polyfill.url"),
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    NEXT_PUBLIC_USERJOT_URL: process.env.NEXT_PUBLIC_USERJOT_URL,
    NEXT_PUBLIC_DEPLOY_MODE: process.env.NEXT_PUBLIC_DEPLOY_MODE,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
  },
  emptyStringAsUndefined: true,
})
