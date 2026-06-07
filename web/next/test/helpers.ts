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

export const APP_NAME = "Cafe"
export const APP_TAGLINE = "Your Smart Companion for Tables"
export const APP_DESCRIPTION = "Cafe, your smart companion for tables."
export const DEFAULT_TITLE = `${APP_NAME} - ${APP_TAGLINE}`
export const ROBOTS_HEADER = "noindex, nofollow"

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

// Signs in as the local AgentCafe user and returns the session cookie pair
// ("better-auth.session_token=...").
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

// content inventory: keep in sync with content/*/meta.json (ordered)
export const DOCS_SLUGS = [
  "",
  "design-system/foundations/colors",
  "design-system/foundations/radius",
  "design-system/foundations/typography",
]
export const BLOG_SLUGS = ["", "hello-world"]

export const DOCS_PAGES: Record<string, { title: string; description: string }> = {
  "": { title: "Introduction", description: "Documentation for Cafe." },
  "design-system/foundations/colors": {
    title: "Colors",
    description: "Semantic color tokens used across Cafe. Defined as CSS variables in globals.css.",
  },
  "design-system/foundations/radius": {
    title: "Radius",
    description: "Border radius scale derived from a single base token.",
  },
  "design-system/foundations/typography": {
    title: "Typography",
    description: "Font families and type usage in Cafe.",
  },
}

export const BLOG_PAGES: Record<string, { title: string; description: string }> = {
  "": { title: "Blog", description: "Latest articles and updates" },
  "hello-world": {
    title: "Hello, World",
    description: "Welcome to the Cafe blog. This is a placeholder post.",
  },
}
