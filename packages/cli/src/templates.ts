export interface Brand {
  name: string
}

// packages/config/src/site.ts: regenerated with the product name, repo URL, and placeholders.
export const siteTemplate = ({
  name,
}: Brand): string => `// Brand identity for this app: the single source a fork edits to rebrand. web reads it via lib/config.ts.
export const site = {
  name: "${name}",
  description: "${name} is just getting started. Tell its story here.",
  tagline: "Your tagline, ready when you are.",
  social: {
    github: "",
    x: "",
    discord: "",
  },
  // Local-only dev agent identity (api/hono agents router).
  agent: {
    name: "Agent",
    email: "agent@example.com",
  },
  // Injectable long-form text blocks. A product sets its own, or leaves them empty.
  apiReferenceDescription: "",
  llmsFullPreamble: "",
} as const

export type Site = typeof site
`

// web/next/src/app/page.tsx: a minimal generic home that reads the brand from site config.
export const homeTemplate = (): string => `import Link from "next/link"

import { site } from "@packages/config/site"

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{site.name}</h1>
      <p className="text-muted-foreground max-w-xl text-lg">{site.description}</p>
      <div className="flex gap-3">
        <Link
          href="/docs"
          className="bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-medium"
        >
          Documentation
        </Link>
        <Link href="/dashboard" className="rounded-md border px-5 py-2.5 text-sm font-medium">
          Dashboard
        </Link>
      </div>
    </main>
  )
}
`

// AGENTS.md (CLAUDE.md is a symlink to it): a generic agent guide.
export const agentsTemplate = (): string => `# AGENTS.md

Guidance for AI coding agents working in this repository.

## Instructions

- ALWAYS: Use \`@/\` for imports, if applicable.
- ALWAYS: Keep documentation in sync with code changes.
- Do not comment unnecessarily. Only comment when it is absolutely necessary, and keep comments on a single line.

## Logging in (agents)

The local dev API exposes a sign-in-as endpoint for the agent identity in \`@packages/config/site\` (\`site.agent\`). It is local-only and requires a trusted Origin. See \`api/hono/src/routers/agents.ts\`.
`

// web/next/content/docs/index.mdx: docs anchor. Description must match docs.config.ts.
export const DOCS_INDEX_DESCRIPTION = "Documentation."

export const docsIndexTemplate = (): string => `---
slug: /docs
title: Introduction
description: ${DOCS_INDEX_DESCRIPTION}
---

# Introduction

This is your documentation home. Start writing, this page is yours.
`

// web/next/content/console/docs/index.mdx: generic console docs anchor.
export const consoleIndexTemplate = (): string => `---
slug: /console/docs
title: Introduction
description: Internal documentation.
---

# Introduction

Your team's internal docs live here.
`

// web/next/content/blog/index.mdx: generic blog landing.
export const blogIndexTemplate = (): string => `---
title: Blog
description: Latest articles and updates
createdAt: 2026-01-01
---

## Recent Posts

<BlogPostList />
`

// web/next/content/blog/hello-world.mdx: a generic sample post so the blog is not empty.
export const sampleBlogPostTemplate = (): string => `---
title: Hello World
description: The first post on your new blog.
createdAt: 2026-01-01
publishedAt: 2026-01-01
---

## Hello World

Your very first post. Replace it with something worth reading.
`

// web/next/docs.config.ts: regenerated to the stub doc set (one public anchor + the console anchor).
export const docsConfigTemplate =
  (): string => `import type { DocsConfig } from "./src/lib/docs/types"

const docsConfig = {
  docs: {
    "Getting Started": [
      {
        "/docs": {
          title: "Introduction",
          description: "${DOCS_INDEX_DESCRIPTION}",
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
`
