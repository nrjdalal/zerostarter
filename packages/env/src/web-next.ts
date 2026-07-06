import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

import "@/lib/utils"
import { NODE_ENV } from "@/lib/constants"
import { skipClientValidation, skipServerValidation } from "@/lib/skip"

// Split into two createEnv calls so the server and client sections can be skipped independently (t3-env's skipValidation is one boolean per call). The client env extends the server env, so the exported `env` carries both when validating.
const serverRuntimeEnv = {
  NODE_ENV: process.env.NODE_ENV,
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
}

const serverEnv = createEnv({
  server: {
    NODE_ENV,
    INTERNAL_API_URL: z.url().optional(),
  },
  runtimeEnv: serverRuntimeEnv,
  emptyStringAsUndefined: true,
  skipValidation: skipServerValidation,
})

export const env = createEnv({
  extends: [serverEnv],
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_NODE_ENV: NODE_ENV,
    NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().optional(),
    NEXT_PUBLIC_USERJOT_URL: z.url().optional(),
  },
  runtimeEnv: {
    // Server vars are repeated here so they survive t3-env's skip short-circuit: when the client section is skipped, createEnv returns this runtimeEnv verbatim and does not merge `extends`.
    ...serverRuntimeEnv,
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ??
      (skipClientValidation ? "https://polyfill.url" : undefined),
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ??
      (skipClientValidation ? "https://polyfill.url" : undefined),
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
    NEXT_PUBLIC_USERJOT_URL: process.env.NEXT_PUBLIC_USERJOT_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: skipClientValidation,
})
