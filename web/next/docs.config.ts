import { site } from "@packages/config/site"

import type { DocsConfig } from "./src/lib/docs/types"

// Single source of truth for docs structure and metadata. Groups are ordered arrays; each item is a single-key record keyed by a page URL (value = metadata) or a subgroup label (value = nested items). Keys are literal URLs ("/docs" = the docs index).
// title/description are synced into each MDX's frontmatter by the web/next build/dev (.github/scripts/docs.ts); `label` overrides the sidebar label (defaults to title).
const docsConfig = {
  docs: {
    "Getting Started": [
      {
        "/docs": {
          title: "Introduction",
          description: site.description,
        },
      },
      {
        "/docs/getting-started/architecture": {
          title: "Architecture",
          description: `Learn about the architecture and tech stack used in ${site.name}.`,
        },
      },
      {
        "/docs/getting-started/project-structure": {
          title: "Project Structure",
          description: `Understand the monorepo structure and organization of ${site.name}.`,
        },
      },
      {
        "/docs/getting-started/type-safe-api": {
          title: "Type-Safe API Client",
          description: "Learn how to use the type-safe API client with Hono RPC.",
        },
      },
      {
        "/docs/getting-started/setup": {
          title: "Setup",
          description: `Step-by-step guide to install and set up ${site.name}.`,
        },
      },
      {
        "/docs/getting-started/scripts": {
          title: "Scripts",
          description: "Available scripts for development, maintenance, and production.",
        },
      },
      {
        "/docs/getting-started/roadmap": {
          title: "Roadmap",
          description: `What ${site.name} ships today, plus the integrations planned on the roadmap.`,
        },
      },
    ],
    Manage: [
      {
        Authentication: [
          {
            "/docs/manage/authentication": {
              title: "Authentication",
              description:
                "Authentication system with Better Auth, supporting OAuth providers, organizations, teams, and role-based access.",
              label: "Auth & Organizations",
            },
          },
          {
            "/docs/manage/dashboard": {
              title: "Dashboard",
              description:
                "Protected dashboard with authentication, organization management, and sidebar navigation.",
            },
          },
        ],
      },
      {
        "Backend & Data": [
          {
            "/docs/manage/database": {
              title: "Database",
              description:
                "PostgreSQL database schema, Drizzle ORM configuration, and migration workflows.",
            },
          },
          {
            "/docs/manage/api-conventions": {
              title: "API Conventions",
              description:
                "Standardized API response format, error handling, and middleware patterns.",
            },
          },
        ],
      },
      {
        Analytics: [
          {
            "/docs/manage/analytics": {
              title: "Analytics",
              description:
                "Configure PostHog analytics for product insights and user behavior tracking.",
              label: "PostHog",
            },
          },
        ],
      },
      {
        "Code Quality": [
          {
            "/docs/manage/code-quality": {
              title: "Code Quality",
              description: "Git hooks, linting, formatting, and commit conventions.",
              label: "Git Hooks & Linting",
            },
          },
        ],
      },
      {
        "Content Management": [
          {
            "/docs/manage/blog": {
              title: "Blog",
              description: "Manage blog content and articles.",
            },
          },
          {
            "/docs/manage/documentation": {
              title: "Documentation",
              description: "Manage documentation content and search.",
            },
          },
          {
            "/docs/manage/feedback": {
              title: "Feedback",
              description: "Configure and manage user feedback collection.",
            },
          },
        ],
      },
      {
        "Environment & Release": [
          {
            "/docs/manage/environment": {
              title: "Environment Variables",
              description: "Configure type-safe environment variables for your application.",
              label: "Environment",
            },
          },
          {
            "/docs/manage/release": {
              title: "Release Management",
              description: "Automate releases and changelog generation.",
              label: "Release",
            },
          },
        ],
      },
      {
        "UI & Styling": [
          {
            "/docs/manage/theming": {
              title: "Theming",
              description: "Dark mode, CSS variables, and styling with Tailwind CSS v4.",
            },
          },
          {
            "/docs/manage/og-images": {
              title: "OG Images",
              description: "Dynamic Open Graph image generation for social media previews.",
            },
          },
        ],
      },
      {
        "Indexing and AI/LLM": [
          {
            "/docs/manage/llms-txt": {
              title: "llms.txt",
              description: "Auto-generated documentation endpoint for AI assistants.",
            },
          },
          {
            "/docs/manage/robots": {
              title: "robots.txt",
              description: "Search engine crawler instructions.",
            },
          },
          {
            "/docs/manage/sitemap": {
              title: "Sitemap",
              description: "Auto-generated sitemap for search engines.",
            },
          },
        ],
      },
    ],
    Deployment: [
      {
        "/docs/deployment/docker": {
          title: "Docker Deployment",
          description: `Deploy ${site.name} with Docker and Docker Compose.`,
          label: "Docker",
        },
      },
      {
        "/docs/deployment/vercel": {
          title: "Deploy at Vercel",
          description: "Deploy your frontend and backend at Vercel.",
          label: "Vercel",
        },
      },
    ],
    Resources: [
      {
        "/docs/resources/ai-skills": {
          title: "AI Skills",
          description:
            "Pre-defined skills for AI assistants and LLM agents to help with common tasks.",
        },
      },
      {
        "/docs/resources/ide-setup": {
          title: "IDE Setup",
          description: `Recommended IDE configuration for ${site.name}.`,
        },
      },
      {
        "/docs/resources/infisical": {
          title: "Infisical",
          description: "Secrets Management on Autopilot.",
        },
      },
    ],
    MIT: [
      {
        "/docs/contributing": {
          title: "Contributing",
          description: `Guidelines for contributing to ${site.name}.`,
        },
      },
    ],
  },
  console: {
    "Getting Started": [
      {
        "/console/docs": {
          title: "Introduction",
          description: "Internal documentation.",
        },
      },
    ],
  },
} satisfies DocsConfig

export default docsConfig
