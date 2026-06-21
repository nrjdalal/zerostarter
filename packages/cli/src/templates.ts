export interface Brand {
  name: string
}

// packages/config/src/site.ts: regenerated with the product name, repo URL, and placeholders.
export const siteTemplate = ({ name }: Brand): string => {
  const display = name.charAt(0).toUpperCase() + name.slice(1)
  return `// Brand identity for this app: the single source a fork edits to rebrand. web reads it via lib/config.ts.
export const site = {
  name: "${display}",
  description: "${display} is just getting started. Tell its story here.",
  tagline: "Your tagline, ready when you are.",
  social: {
    github: "",
    x: "",
    discord: "",
  },
  // Local-only dev agent identity (api/hono agents router).
  agent: {
    name: "LocalAgent",
    email: "agent@local.host",
  },
  // Injectable long-form text blocks. A product sets its own, or leaves them empty.
  apiReferenceDescription: "",
  llmsFullPreamble: "",
} as const

export type Site = typeof site
`
}

// web/next/src/app/page.tsx: a fresh fork has no product yet, so the home redirects to the waitlist.
export const homeTemplate = (): string => `import { redirect } from "next/navigation"

// Fresh fork: redirect to the waitlist until you build your real home page.
export default function Home() {
  redirect("/waitlist")
}
`

// AGENTS.md (CLAUDE.md is a symlink to it): a minimal agent guide for the fork to grow.
export const agentsTemplate = (): string => `# AGENTS.md

Guidance for AI coding agents working in this repository.
`

// web/next/content/docs/index.mdx: docs anchor. The description must match docs.config.ts.
export const docsIndexTemplate = (): string => `---
slug: /docs
title: Introduction
description: Documentation.
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
export const blogIndexTemplate = (date: string): string => `---
title: Blog
description: Latest articles and updates
createdAt: ${date}
---

## Recent Posts

<BlogPostList />
`

// web/next/content/blog/hello-world.mdx: a generic sample post so the blog is not empty.
export const sampleBlogPostTemplate = (date: string): string => `---
title: Hello World
description: The first post on your new blog.
createdAt: ${date}
publishedAt: ${date}
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
          description: "Documentation.",
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
