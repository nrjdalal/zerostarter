import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

// Mirrors lib/constants NODE_ENV; inlined because this entry is exported as source (Vite must transform it to inline import.meta.env in the client bundle) and lib/constants carries tsdown-injected version globals that only exist in dist builds.
const NODE_ENV = z.enum(["local", "development", "test", "staging", "production"])

// Vite statically replaces literal import.meta.env.VITE_* in transformed code; the cast avoids augmenting ImportMeta globally (the app already gets that from vite/client).
const meta = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env

const fromProcess = (key: string): string | undefined =>
  typeof process === "undefined" ? undefined : process.env[key]

const asString = (value: string | boolean | undefined): string | undefined =>
  typeof value === "string" ? value : undefined

export const env = createEnv({
  server: {
    NODE_ENV,
    INTERNAL_API_URL: z.url().optional(),
  },
  clientPrefix: "VITE_",
  client: {
    VITE_APP_URL: z.url(),
    VITE_API_URL: z.url(),
    VITE_NODE_ENV: NODE_ENV,
    VITE_POSTHOG_HOST: z.url().optional(),
    VITE_POSTHOG_KEY: z.string().optional(),
    VITE_USERJOT_URL: z.url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: fromProcess("NODE_ENV"),
    INTERNAL_API_URL: fromProcess("INTERNAL_API_URL"),
    VITE_API_URL:
      asString(import.meta.env.VITE_API_URL) ??
      fromProcess("VITE_API_URL") ??
      (fromProcess("SKIP_ENV_VALIDATION") === "true" ? "https://polyfill.url" : undefined),
    VITE_APP_URL:
      asString(import.meta.env.VITE_APP_URL) ??
      fromProcess("VITE_APP_URL") ??
      (fromProcess("SKIP_ENV_VALIDATION") === "true" ? "https://polyfill.url" : undefined),
    // The server runs with the repo's NODE_ENV (e.g. "local"); the client bundle falls back to Vite's mode, which the app only ever inspects via isProduction/isDevelopment-style checks.
    VITE_NODE_ENV:
      fromProcess("NODE_ENV") ??
      asString(import.meta.env.VITE_NODE_ENV) ??
      (meta?.DEV === true ? "development" : "production"),
    VITE_POSTHOG_HOST: asString(import.meta.env.VITE_POSTHOG_HOST),
    VITE_POSTHOG_KEY: asString(import.meta.env.VITE_POSTHOG_KEY),
    VITE_USERJOT_URL: asString(import.meta.env.VITE_USERJOT_URL),
  },
  emptyStringAsUndefined: true,
  skipValidation: fromProcess("SKIP_ENV_VALIDATION") === "true",
})
