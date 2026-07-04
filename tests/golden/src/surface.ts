// The pinned surface of the app: every route, endpoint, and identity fact the golden suite locks.
// If a change breaks one of these on purpose (page added/removed, copy changed), update the fixture in the same change; that is the point of a golden suite.

export const SITE = {
  name: "ZeroStarter",
  tagline: "Production-ready SaaS infrastructure with world-class human and agent DX",
  agent: { name: "LocalAgent", email: "agent@local.host" },
} as const

// Every docs page URL with its title (source of truth: web/next/docs.config.ts, synced into MDX frontmatter).
export const DOCS_PAGES: Record<string, string> = {
  "/docs": "Introduction",
  "/docs/contributing": "Contributing",
  "/docs/deployment/docker": "Deploy with Docker",
  "/docs/deployment/vercel": "Deploy to Vercel",
  "/docs/getting-started/architecture": "Architecture",
  "/docs/getting-started/project-structure": "Project Structure",
  "/docs/getting-started/roadmap": "Roadmap",
  "/docs/getting-started/scripts": "Scripts",
  "/docs/getting-started/setup": "Quickstart",
  "/docs/getting-started/type-safe-api": "The Type-Safe API",
  "/docs/getting-started/working-with-agents": "Working with Agents",
  "/docs/manage/analytics": "Analytics & Feedback",
  "/docs/manage/api-conventions": "API Conventions",
  "/docs/manage/authentication": "Auth & Organizations",
  "/docs/manage/code-quality": "Code Quality",
  "/docs/manage/content": "Content",
  "/docs/manage/dashboard": "Dashboard",
  "/docs/manage/database": "Database",
  "/docs/manage/environment": "Environment Variables",
  "/docs/manage/llms-txt": "llms.txt",
  "/docs/manage/release": "Releases",
  "/docs/manage/seo": "SEO & Metadata",
  "/docs/manage/theming": "Theming",
  "/docs/resources/ai-skills": "AI Skills",
  "/docs/resources/ide-setup": "IDE Setup",
  "/docs/resources/infisical": "Infisical",
}

// Every published blog post with its title.
export const BLOG_POSTS: Record<string, string> = {
  "/blog/a-biography-written-in-code": "A Biography Written in Code",
  "/blog/mcp-per-workspace":
    "Race-Free Identity in Claude Code: Per-Workspace MCP, GitHub, and Git",
  "/blog/web-development-2026": "How to Do Web Development in 2026",
}

// Public marketing pages with their exact <title> values.
export const MARKETING_PAGES: Record<string, string> = {
  "/": "ZeroStarter - Production-ready SaaS infrastructure with world-class human and agent DX",
  "/hire": "Neeraj Dalal | ZeroStarter",
  "/resume": "Résumé - Neeraj Dalal | ZeroStarter",
  "/waitlist":
    "ZeroStarter - Production-ready SaaS infrastructure with world-class human and agent DX",
}

// The sitemap must contain exactly these paths: home + every docs page + every published post.
export const SITEMAP_PATHS = ["/", ...Object.keys(DOCS_PAGES), ...Object.keys(BLOG_POSTS)].sort()

// Every path the OpenAPI document exposes (only routes with describeRoute are documented).
export const OPENAPI_PATHS: Record<string, string[]> = {
  "/api/health": ["get"],
  "/api/v1/session": ["get"],
  "/api/v1/user": ["get"],
  "/api/waitlist": ["get", "post"],
}

// Every code the API error envelope can carry (api/hono/src/lib/error.ts).
export const ERROR_CODES = [
  "AGENT_LOGIN_FAILED",
  "BAD_REQUEST",
  "ERROR",
  "FORBIDDEN",
  "INTERNAL_SERVER_ERROR",
  "NOT_FOUND",
  "TOO_MANY_REQUESTS",
  "UNAUTHORIZED",
  "VALIDATION_ERROR",
] as const

// Anonymous requests share the global limiter; authenticated users get a doubled per-user budget.
export const RATE_LIMIT = { anon: 60, user: 120, windowSeconds: 60 } as const

export const AUTH_PROVIDERS = ["github", "google"] as const
