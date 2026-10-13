import { site } from "@packages/config/site"

import type { DocsConfig } from "./src/lib/docs"

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
          description:
            "How the monorepo fits together: two apps, their packages, one import graph.",
        },
      },
      {
        "/docs/getting-started/cli": {
          title: "CLI",
          description:
            "Scaffold, re-scaffold, and re-baseline a fork: the init, reinit, and sync commands.",
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
        "/docs/getting-started/realtime": {
          title: "Realtime",
          description:
            "WebSockets on Hono: one typed client, a Bun and Node adapter split for Vercel, and a REST-baseline fallback.",
        },
      },
      {
        "/docs/manage/api-conventions": {
          title: "API Conventions",
          description:
            "The { data } / { error } envelope, the routes that answer outside it, error codes, and the middleware in front of every route.",
        },
      },
      {
        "/docs/manage/rate-limiting": {
          title: "Rate Limiting",
          description:
            "Layered rate limits: a per-address budget on every request, a second, per-user budget for signed-in /api/v1 requests on top of it, and Better Auth's own limiter on its routes in production.",
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
          title: "Authentication",
          description:
            "Better Auth sign-in, sessions and cookies, and the role ladder behind /console: user.role is the only truth, re-read past the cookie cache.",
        },
      },
      {
        "/docs/manage/allowlist": {
          title: "Allowlist",
          description:
            "Grant console access by domain or address, without promoting people one at a time.",
        },
      },
      {
        "/docs/manage/activity": {
          title: "Activity",
          description:
            "A readable trail of every console write: who changed a role, banned an account, edited the allowlist, or removed a signup.",
        },
      },
      {
        "/docs/manage/organizations": {
          title: "Organizations & Teams",
          description:
            "Multi-tenant from Better Auth: the org and team data model, roles, invitations, and active-org switching.",
          label: "Organizations",
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
            "The docs and blog as markdown for LLMs, generated at build: an index at /llms.txt and the full text at /llms-full.txt.",
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
        "/docs/manage/data-tables": {
          title: "Data Tables",
          description:
            "Compose a table from one module: URL state, virtualized infinite scroll, and headers that size themselves.",
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
        "/docs/manage/waitlist": {
          title: "Waitlist",
          description:
            "Collect addresses before launch on a public page, and read them back at Console > Waitlist > Signups.",
        },
      },
      {
        "/docs/manage/features": {
          title: "Features",
          description:
            "One boolean per optional surface: off removes its routes, links, sitemap and search entries without deleting code.",
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
            "Optional PostHog analytics and a feedback link, plus Speed Insights on every Vercel deploy.",
        },
      },
    ],
    Deploy: [
      {
        "/docs/deployment/vercel": {
          title: "Deploy to Vercel",
          description:
            "Ship web and api as two Vercel projects on one database; the api build migrates on production and canary deploys.",
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
            "Which check runs on the commit, the push and the pull request, and the commit message rules the release reads.",
        },
      },
      {
        "/docs/manage/release": {
          title: "Releases",
          description:
            "One merge promotes canary to main: the version lands before it, the changelog, tag and GitHub release after.",
        },
      },
      {
        "/docs/getting-started/scripts": {
          title: "Scripts",
          description:
            "Every bun run script and the tooling behind it: what each does, when it runs, and where a new one goes.",
        },
      },
      {
        "/docs/getting-started/roadmap": {
          title: "Roadmap",
          description: `What ${site.name} ships, what a fork adds itself, and what is considered but not scheduled.`,
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
