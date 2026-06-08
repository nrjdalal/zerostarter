/**
 * Shared helpers for the web/next behavioral spec suite — the golden-master
 * parity contract. How to run, env flags, the stack orchestrator, and the
 * gotchas live in the `web-spec` skill (.agents/skills/web-spec/SKILL.md).
 */
import { setDefaultTimeout } from "bun:test"

// Imported by every deterministic test file before any test() registers, so
// this sets the tier-wide timeout. It must clear the 429 retry budget (up to
// 4 × 2s capped sleeps, see req() below) plus request time, otherwise a
// sustained rate-limit would surface as an opaque timeout instead of the
// returned 429. 15s leaves headroom; the browser tier sets its own per-test
// timeouts which override this.
setDefaultTimeout(15_000)

export const BASE = process.env.BASE_URL ?? "http://localhost:3000"
export const API = process.env.API_URL ?? "http://localhost:4000"

// dev: navbar renders on /, agents login button visible. prod builds hide both.
const rawMode = process.env.TEST_MODE ?? "dev"
if (rawMode !== "dev" && rawMode !== "prod") {
  throw new Error(`TEST_MODE must be "dev" or "prod", got "${rawMode}"`)
}
export const MODE: "dev" | "prod" = rawMode

export const APP_NAME = "ZeroStarter"
export const APP_TAGLINE = "The SaaS Starter"
export const APP_DESCRIPTION =
  "A modern, type-safe, and high-performance SaaS starter template built with a monorepo architecture."
export const DEFAULT_TITLE = `${APP_NAME} - ${APP_TAGLINE}`

// One copy of the backoff policy. Retries on 429 only: the suite fires ~100
// requests and the API rate-limits 60/min per IP, so back-to-back runs would
// otherwise flake. Rate-limiting is deliberately not a behavior under test (it
// would poison sibling tests), so backing off here targets the limiter without
// masking anything. The 2s cap keeps the worst case under the hook timeout.
async function retryOn429(send: () => Promise<Response>): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await send()
    if (res.status !== 429 || attempt >= 4) return res
    const retryAfter = Math.min(Number(res.headers.get("retry-after")) || 1, 2)
    await new Promise((r) => setTimeout(r, retryAfter * 1000))
  }
}

// req: any method against the app base, redirects never auto-followed so the
// suite can assert 3xx targets. `get` kept as a readable alias for GET sites.
export const req = (path: string, init?: RequestInit): Promise<Response> =>
  retryOn429(() => fetch(`${BASE}${path}`, { redirect: "manual", ...init }))
export const get = req

// Signs in as the local AgentZero user and returns the session cookie pair
// ("better-auth.session_token=..."). The endpoint upserts a single agent user
// (agent@zerostarter.dev), so it leaves no per-run residue to clean up.
export const signInAsAgent = async (): Promise<string> => {
  const res = await retryOn429(() =>
    fetch(`${API}/api/agents/sign-in-as`, {
      method: "POST",
      headers: { origin: BASE },
      redirect: "manual",
    }),
  )
  return (res.headers.get("set-cookie") ?? "").split(";")[0]
}

export const stripBuster = (s: string) => s.replace(/\?t=\d+/g, "")

export interface Head {
  title?: string
  metas: Record<string, string>
  links: { rel: string; href: string }[]
}

export function extractHead(html: string): Head {
  const head = html.split("</head>")[0]
  const title = head.match(/<title>(.*?)<\/title>/)?.[1]
  const metas: Record<string, string> = {}
  for (const m of head.matchAll(/<meta\s+([^>]+?)\/?>/g)) {
    const attrs = m[1]
    const key = attrs.match(/(?:name|property)="([^"]+)"/)?.[1]
    const content = attrs.match(/content="([^"]*)"/)?.[1]
    if (key && content !== undefined) metas[key] = stripBuster(content)
  }
  const links = [...head.matchAll(/<link\s+([^>]+?)\/?>/g)].map((m) => ({
    rel: m[1].match(/rel="([^"]+)"/)?.[1] ?? "",
    href: m[1].match(/href="([^"]+)"/)?.[1] ?? "",
  }))
  return { title, metas, links }
}

export function pngInfo(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return {
    isPng: bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
    width: view.getUint32(16),
    height: view.getUint32(20),
    size: bytes.length,
  }
}

// Content inventory — keep in sync with content/*/meta.json (ordered). Titles
// are pinned as golden literals (short and stable); a copy/title change should
// fail a test. Descriptions are not pinned exactly (29 docs drift often); the
// meta tests assert a non-empty description per page instead.
export const DOCS_SLUGS = [
  "",
  "getting-started/architecture",
  "getting-started/project-structure",
  "getting-started/type-safe-api",
  "getting-started/setup",
  "getting-started/scripts",
  "getting-started/roadmap",
  "manage/authentication",
  "manage/dashboard",
  "manage/database",
  "manage/api-conventions",
  "manage/analytics",
  "manage/blog",
  "manage/code-quality",
  "manage/documentation",
  "manage/feedback",
  "manage/environment",
  "manage/release",
  "manage/theming",
  "manage/og-images",
  "manage/llms-txt",
  "manage/robots",
  "manage/sitemap",
  "deployment/docker",
  "deployment/vercel",
  "resources/ai-skills",
  "resources/ide-setup",
  "resources/infisical",
  "contributing",
]

export const BLOG_SLUGS = ["", "web-development-2026"]

export const DOCS_TITLES: Record<string, string> = {
  "": "Introduction",
  "getting-started/architecture": "Architecture",
  "getting-started/project-structure": "Project Structure",
  "getting-started/type-safe-api": "Type-Safe API Client",
  "getting-started/setup": "Setup",
  "getting-started/scripts": "Scripts",
  "getting-started/roadmap": "Roadmap",
  "manage/authentication": "Authentication",
  "manage/dashboard": "Dashboard",
  "manage/database": "Database",
  "manage/api-conventions": "API Conventions",
  "manage/analytics": "Analytics",
  "manage/blog": "Blog",
  "manage/code-quality": "Code Quality",
  "manage/documentation": "Documentation",
  "manage/feedback": "Feedback",
  "manage/environment": "Environment Variables",
  "manage/release": "Release Management",
  "manage/theming": "Theming",
  "manage/og-images": "OG Images",
  "manage/llms-txt": "llms.txt",
  "manage/robots": "robots.txt",
  "manage/sitemap": "Sitemap",
  "deployment/docker": "Docker Deployment",
  "deployment/vercel": "Deploy at Vercel",
  "resources/ai-skills": "AI Skills",
  "resources/ide-setup": "IDE Setup",
  "resources/infisical": "Infisical",
  contributing: "Contributing",
}

export const BLOG_TITLES: Record<string, string> = {
  "": "Blog",
  "web-development-2026": "How to Do Web Development in 2026",
}
