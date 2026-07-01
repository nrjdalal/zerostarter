import { site } from "@packages/config/site"

import type { DocsConfig } from "./src/lib/docs/types"

// Single source of truth for docs structure and metadata. Groups are ordered arrays; each item is a single-key record keyed by a page URL (value = metadata) or a subgroup label (value = nested items). Keys are literal URLs ("/docs" = the docs index).
// title/description are synced into each MDX's frontmatter by the web/next build/dev (.github/scripts/docs.ts); `label` overrides the sidebar label (defaults to title). Group name is independent of the page URL, so pages regroup without changing links.
const docsConfig = {
  docs: {
    "Get Started": [
      {
        "/docs": {
          title: "Introduction",
          description: site.description,
        },
      },
      {
        "/docs/getting-started/setup": {
          title: "Quickstart",
          description: "Go from one command to a running, signed-in app, and where to go next.",
        },
      },
      {
        "/docs/getting-started/architecture": {
          title: "Architecture",
          description:
            "The stack, and why each piece is here: one typed monorepo from Postgres to the DOM.",
        },
      },
      {
        "/docs/getting-started/project-structure": {
          title: "Project Structure",
          description: "How the monorepo fits together: two apps, four packages, one import graph.",
        },
      },
    ],
    "Core Concepts": [
      {
        "/docs/getting-started/type-safe-api": {
          title: "The Type-Safe API",
          description:
            "How one AppType flows from Hono routes to a fully-typed client, with no codegen.",
          label: "Type-Safe API",
        },
      },
      {
        "/docs/manage/api-conventions": {
          title: "API Conventions",
          description:
            "The { data } / { error } envelope, error codes, and middleware every route shares.",
        },
      },
      {
        "/docs/manage/database": {
          title: "Database",
          description: "PostgreSQL with Drizzle: the schema, and the generate-then-migrate loop.",
        },
      },
      {
        "/docs/manage/authentication": {
          title: "Auth & Organizations",
          description:
            "Better Auth with OAuth, organizations, teams, and the role gate behind /console.",
        },
      },
      {
        "/docs/manage/environment": {
          title: "Environment Variables",
          description:
            "One validated .env, read per-consumer so client code can never touch server secrets.",
          label: "Environment",
        },
      },
    ],
    "Build with Agents": [
      {
        "/docs/getting-started/working-with-agents": {
          title: "Working with Agents",
          description:
            "The loop an AI agent uses here: skills, a local login, agent-browser, and llms.txt.",
        },
      },
      {
        "/docs/resources/ai-skills": {
          title: "AI Skills",
          description:
            "The bundled SKILL.md recipes that teach an agent this repo's conventions and traps.",
        },
      },
      {
        "/docs/manage/llms-txt": {
          title: "llms.txt",
          description:
            "Auto-generated, whole-codebase context for LLMs at /llms.txt and /llms-full.txt.",
        },
      },
    ],
    "Build Your App": [
      {
        "/docs/manage/dashboard": {
          title: "Dashboard",
          description:
            "The protected app shell: sidebar, org switcher, and the layout wrappers to build on.",
        },
      },
      {
        "/docs/manage/theming": {
          title: "Theming",
          description:
            "Dark mode, OKLCH design tokens, and Tailwind v4: restyle without fighting the system.",
        },
      },
      {
        "/docs/manage/content": {
          title: "Content",
          description:
            "Author docs and blog posts in MDX, with full-text search and draft/publish built in.",
          label: "Content (Blog & Docs)",
        },
      },
      {
        "/docs/manage/seo": {
          title: "SEO & Metadata",
          description:
            "Dynamic OG images, sitemap, and robots: indexable and shareable by default.",
        },
      },
      {
        "/docs/manage/analytics": {
          title: "Analytics & Feedback",
          description:
            "Optional PostHog analytics and a feedback link: wire them in when you need them.",
        },
      },
    ],
    Deploy: [
      {
        "/docs/deployment/vercel": {
          title: "Deploy to Vercel",
          description:
            "Ship web and api as two Vercel projects on one database; migrations run on deploy.",
          label: "Vercel",
        },
      },
      {
        "/docs/deployment/docker": {
          title: "Deploy with Docker",
          description: "Run the whole stack anywhere with the multi-stage Dockerfiles and Compose.",
          label: "Docker",
        },
      },
    ],
    "Ship & Maintain": [
      {
        "/docs/manage/code-quality": {
          title: "Code Quality",
          description:
            "Oxlint, Oxfmt, and the git hooks that keep every commit formatted, linted, and building.",
        },
      },
      {
        "/docs/manage/release": {
          title: "Releases",
          description:
            "The automated canary-to-main flow that versions the repo and drafts the changelog.",
        },
      },
      {
        "/docs/getting-started/scripts": {
          title: "Scripts",
          description: "Every bun script, grouped by when you'd reach for it.",
        },
      },
      {
        "/docs/getting-started/roadmap": {
          title: "Roadmap",
          description: `What ${site.name} ships today, and where it's headed.`,
        },
      },
    ],
    Resources: [
      {
        "/docs/resources/ide-setup": {
          title: "IDE Setup",
          description: "VS Code and Cursor settings for the Oxc toolchain.",
        },
      },
      {
        "/docs/resources/infisical": {
          title: "Infisical",
          description: "Optional secrets management: pull your .env from a shared vault.",
        },
      },
      {
        "/docs/contributing": {
          title: "Contributing",
          description: `How to propose a change to ${site.name}: branch off canary, keep docs in sync, open a PR.`,
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
