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
    name: "Cafe",
    description: "Cafe, your smart companion for tables.",
    tagline: "Your Smart Companion for Tables",
    url: env.NEXT_PUBLIC_APP_URL,
    version: BUILD_VERSION,
  },

  // API configuration
  api: {
    url: env.NEXT_PUBLIC_API_URL,
    internalUrl: getInternalApiUrl(),
  },

  // Social links
  social: {
    github: "https://github.com/dalonic/cafe",
    instagram: "https://instagram.com/dalonic_ai",
    reddit: "https://reddit.com/user/dalonic_ai",
    x: "https://x.com/dalonic_ai",
  },

  // Feature flags
  features: {
    // example: enableAnalytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  },

  // Sidebar navigation configuration
  sidebar: {
    groups: [
      {
        label: "Getting Started",
        items: [
          {
            title: "Introduction",
            url: "/docs",
          },
        ],
      },
      {
        label: "Design System",
        collapsible: true,
        categories: {
          Foundations: [
            {
              title: "Colors",
              url: "/docs/design-system/foundations/colors",
            },
            {
              title: "Radius",
              url: "/docs/design-system/foundations/radius",
            },
            {
              title: "Typography",
              url: "/docs/design-system/foundations/typography",
            },
          ],
        },
      },
    ],
  },
} as const

export type Config = typeof config
