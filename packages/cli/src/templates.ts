export interface Brand {
  name: string
  owner: string
  repo: string
}

// packages/config/src/site.ts: regenerated with the product name, repo URL, and placeholders.
export const siteTemplate = ({
  name,
  owner,
  repo,
}: Brand): string => `// Brand identity for this app: the single source a fork edits to rebrand. web reads it via lib/config.ts.
export const site = {
  name: "${name}",
  description: "TODO: your product description.",
  tagline: "TODO: your tagline.",
  social: {
    github: "https://github.com/${owner}/${repo}",
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

// web/next/content/docs/index.mdx: docs anchor. Description must match docs.config.ts.
export const DOCS_INDEX_DESCRIPTION = "Documentation."

export const docsIndexTemplate = (): string => `---
slug: /docs
title: Introduction
description: ${DOCS_INDEX_DESCRIPTION}
---

# Introduction

Welcome to the documentation. Replace this page with your product's docs.
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

This is a sample post. Replace it with your own writing.
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
