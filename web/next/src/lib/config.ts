import { site } from "@packages/config/site"
import { BUILD_VERSION } from "@packages/env"
import { env } from "@packages/env/web-next"

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
    name: site.name,
    description: site.description,
    tagline: site.tagline,
    url: env.NEXT_PUBLIC_APP_URL,
    version: BUILD_VERSION,
  },

  // API configuration
  api: {
    url: env.NEXT_PUBLIC_API_URL,
    internalUrl: getInternalApiUrl(),
  },

  // Social links
  social: site.social,

  // Feature flags
  features: {
    // example: enableAnalytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  },
} as const

export type Config = typeof config
