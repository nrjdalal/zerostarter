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

  // Sidebar navigation configuration
  sidebar: {
    groups: [
      {
        label: "Getting Started",
        items: [
          {
            title: "Introduction",
            url: "/docs",
            icon: "BookOpen",
          },
          {
            title: "Architecture",
            url: "/docs/getting-started/architecture",
            icon: "Building2",
          },
          {
            title: "Project Structure",
            url: "/docs/getting-started/project-structure",
            icon: "FolderTree",
          },
          {
            title: "Type-Safe API Client",
            url: "/docs/getting-started/type-safe-api",
            icon: "Code",
          },
          {
            title: "Installation",
            url: "/docs/getting-started/installation",
            icon: "Download",
          },
          {
            title: "Scripts",
            url: "/docs/getting-started/scripts",
            icon: "Terminal",
          },
        ],
      },
      {
        label: "Manage",
        collapsible: true,
        categories: {
          "Content Management": [
            {
              title: "Blog",
              url: "/docs/manage/blog",
              icon: "FileText",
            },
            {
              title: "Documentation",
              url: "/docs/manage/documentation",
              icon: "Book",
            },
            {
              title: "Feedback",
              url: "/docs/manage/feedback",
              icon: "MessageSquare",
            },
          ],
          "Environment & Release": [
            {
              title: "Environment",
              url: "/docs/manage/environment",
              icon: "Settings",
            },
            {
              title: "Release",
              url: "/docs/manage/release",
              icon: "Rocket",
            },
          ],
          "Indexing and AI/LLM": [
            {
              title: "llms.txt",
              url: "/docs/manage/llms-txt",
              icon: "Brain",
            },
            {
              title: "robots.txt",
              url: "/docs/manage/robots",
              icon: "Bot",
            },
            {
              title: "Sitemap",
              url: "/docs/manage/sitemap",
              icon: "Map",
            },
          ],
        },
      },
      {
        label: "Deployment",
        items: [
          {
            title: "Vercel",
            url: "/docs/deployment/vercel",
            icon: "Cloud",
          },
        ],
      },
      {
        label: "MIT",
        items: [
          {
            title: "Contributing",
            url: "/docs/contributing",
            icon: "GitBranch",
          },
        ],
      },
    ],
  },
} as const

export type Config = typeof config
