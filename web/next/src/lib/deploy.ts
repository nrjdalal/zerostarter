// Client-safe twin of the suffix set in @packages/auth/lib/utils (which must not reach the client bundle, since the auth package reads server env at import). The template version shares this via a subpath export; keep the two sets identical.
const PUBLIC_HOSTING_SUFFIXES = new Set([
  "vercel.app",
  "netlify.app",
  "pages.dev",
  "github.io",
  "fly.dev",
])

// True when the app and api are two unrelated sites (separate projects on a public hosting suffix), which is the only case where sign-in must route through the api's session handoff.
export function isSplitPair(appUrl: string, apiUrl: string): boolean {
  try {
    const app = new URL(appUrl)
    const api = new URL(apiUrl)
    if (app.origin === api.origin) return false
    const suffix = api.hostname.split(".").slice(1).join(".")
    return PUBLIC_HOSTING_SUFFIXES.has(suffix)
  } catch {
    return false
  }
}
