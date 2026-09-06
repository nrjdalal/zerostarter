export interface Brand {
  name: string
}

export type FeatureFlags = {
  allowlist: boolean
  apiDocs: boolean
  blog: boolean
  docs: boolean
  internalDocs: boolean
  waitlist: boolean
}

// A fresh fork's default surfaces: docs, blog, internal docs, and the API reference on; the waitlist off, so the home is a plain landing page, and the allowlist off, so console access is granted per person. Any can be flipped later in the config.
export const DEFAULT_FEATURES: FeatureFlags = {
  allowlist: false,
  apiDocs: true,
  blog: true,
  docs: true,
  internalDocs: true,
  waitlist: false,
}

const featuresBlock = (
  features: FeatureFlags,
): string => `// Optional surfaces a fork enables or disables. Typed boolean (not \`as const\`) so a fork can flip them and the runtime gates are not dead code. Off means the routes 404 and the links, nav, sitemap, llms, and search drop the surface. waitlist off makes the home a plain landing page.
export const features = {
  allowlist: ${features.allowlist},
  apiDocs: ${features.apiDocs},
  blog: ${features.blog},
  docs: ${features.docs},
  internalDocs: ${features.internalDocs},
  waitlist: ${features.waitlist},
}

export type Feature = keyof typeof features`

// packages/config/src/site.ts: regenerated with the product name, repo URL, and placeholders.
export const siteTemplate = (
  { name }: Brand,
  features: FeatureFlags = DEFAULT_FEATURES,
): string => {
  const display = name.charAt(0).toUpperCase() + name.slice(1)
  // JSON.stringify emits a valid TS string literal whatever the name holds: a quote or backslash in a directory name must not break out of the literal in a module the app executes.
  return `// Brand identity for this app: the single source a fork edits to rebrand. web reads it via lib/config.ts.
export const site = {
  name: ${JSON.stringify(display)},
  description: ${JSON.stringify(`${display} is just getting started. Tell its story here.`)},
  tagline: "Your tagline, ready when you are.",
  social: {
    discord: "",
    github: "",
    x: "",
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

${featuresBlock(features)}
`
}

// web/next/src/app/page.tsx: a fresh fork home. With the waitlist on it redirects to the capture page; with it off it renders a plain landing. Flip features.waitlist in the config to switch, no regeneration needed.
export const homeTemplate = (): string => `import { features, site } from "@packages/config/site"
import { redirect } from "next/navigation"

// Fresh fork: the waitlist capture when the waitlist feature is on, otherwise a plain landing page. Replace this with your real home when ready.
export default function Home() {
  if (features.waitlist) redirect("/waitlist")

  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-8 text-center">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">{site.name}</h1>
        <p className="text-muted-foreground max-w-md text-lg">{site.tagline}</p>
      </div>
    </main>
  )
}
`

// AGENTS.md (CLAUDE.md is a symlink to it): a minimal agent guide for the fork to grow. The skills tables are left empty for the fork's own .github/scripts/skills-manager.ts to fill; the markers are not optional, since that script (and the pre-commit hook running it) throws on a file that lacks them.
export const agentsTemplate = (): string => `# AGENTS.md

Guidance for AI coding agents working in this repository.

## Instructions

- ALWAYS: Use \`@/\` for imports, and follow the \`design\` skill for UI and styling conventions.
- ALWAYS: Keep documentation in sync with every change.
- NEVER: Include "Co-authored-by" in commit messages.
- NEVER: Use em-dashes (the long dash, U+2014) in code, comments, docs, or copy. Regular hyphens are fine; for a pause or aside, use a comma, colon, or period.

## Skills

Skills live in \`.agents/skills\` (symlinked to \`.claude/skills\` and \`.github/skills\`, so every agent tool reads the same files). Each is a \`SKILL.md\` with a \`description\` trigger and a literal procedure. Start with \`codebase-map\` to orient, then load the task skill that fits.

These tables are generated from each skill's own description by \`bun .github/scripts/skills-manager.ts\`, which a pre-commit hook runs for you. **Custom** skills are maintained here; **vendored** skills are copied verbatim from an upstream project (re-vendor to update, do not hand-edit).

**Custom**

<!-- skills:custom -->

<!-- /skills:custom -->

**Vendored** (upstream, copied verbatim)

<!-- skills:vendored -->

<!-- /skills:vendored -->
`

// README.md: a minimal readme for the fork; the author replaces it with their product's.
export const readmeTemplate = ({ name }: Brand): string => {
  const display = name.charAt(0).toUpperCase() + name.slice(1)
  return `# ${display}

Built on top of [ZeroStarter](https://zerostarter.dev).

## Development

\`\`\`bash
bun run dev
\`\`\`

This serves named \`.localhost\` dev URLs via portless (\`bunx portless list\` shows them); \`PORTLESS=0 bun run dev\` uses fixed ports instead (web \`:3000\`, api \`:4000\`).
`
}

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
export const docsConfigTemplate = (): string => `import type { DocsConfig } from "./src/lib/docs"

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
