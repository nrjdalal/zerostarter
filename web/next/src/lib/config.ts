import { env } from "@packages/env/web-next"

const nodeEnv = (process.env.NODE_ENV as "development" | "production") || "development"

// Server-only env vars
const getInternalApiUrl = () => {
  if (typeof window === "undefined") {
    return env.INTERNAL_API_URL
  }
  return undefined
}

export const config = {
  // Application configuration
  app: {
    name: "ZeroStarter",
    description:
      "A modern, type-safe, and high-performance SaaS starter template built with a monorepo architecture.",
    tagline: "The SaaS Starter",
    url: env.NEXT_PUBLIC_APP_URL,
  },

  // API configuration
  api: {
    url: env.NEXT_PUBLIC_API_URL,
    internalUrl: getInternalApiUrl(),
  },

  // Environment
  env: {
    isDevelopment: nodeEnv === "development",
    isProduction: nodeEnv === "production",
    nodeEnv,
  },

  // Social links
  social: {
    github: "https://github.com/nrjdalal/zerostarter",
  },

  // Feature flags
  features: {
    // example: enableAnalytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  },
} as const

export type Config = typeof config
