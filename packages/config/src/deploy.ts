// Deployment-shape helpers shared by the auth package (server) and the web sign-in flow (client), so they live in the client-safe config package rather than in @packages/auth, whose module init reads server env and must never reach the client bundle.

// Multi-tenant hosting apexes on the Public Suffix List (publicsuffix.org): browsers reject a Domain cookie scoped to one, so two sibling deployments (web + api on separate *.vercel.app URLs) can never share a session and sign-in must route through the api's handoff instead. A curated set covers the platforms a fork realistically lands on; a full PSL library would ship tens of KB to the client for one yes/no.
const PUBLIC_HOSTING_SUFFIXES = new Set([
  "deno.dev",
  "firebaseapp.com",
  "fly.dev",
  "github.io",
  "herokuapp.com",
  "netlify.app",
  "onrender.com",
  "pages.dev",
  "vercel.app",
  "web.app",
])

// Name of the first-party cookie that binds a split-mode sign-in to the browser that started it: set on the web origin, matched by the api's handoff claim. Its Max-Age (10 min) bounds how long a started handoff stays claimable; a fork that raises an auth-link expiry past that gets a silent handoff failure, so keep the two in step.
export const HANDOFF_NONCE_COOKIE = "handoff_nonce"

// A single-use handoff token (the id or the nonce): two UUIDs of entropy with hyphens stripped, so the whole 64-char value is the secret. Shared so the web (mint) and api (validate) agree on the shape.
export function mintHandoffToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "")
}

// True when a host sits directly under one of those apexes (e.g. your-api.vercel.app), so its only shareable parent domain is a public suffix.
export function isPublicHostingSuffix(hostname: string): boolean {
  const parent = hostname.split(".").slice(1).join(".")
  return PUBLIC_HOSTING_SUFFIXES.has(parent)
}

// True when app and api are two unrelated sites (separate projects on a public hosting suffix), the only case where sign-in must route through the api's session handoff. The single split predicate both the server (resolveDeployMode) and the web client use, so the two sides cannot drift.
export function isSplitPair(appUrl: string, apiUrl: string): boolean {
  try {
    const app = new URL(appUrl)
    const api = new URL(apiUrl)
    return app.origin !== api.origin && isPublicHostingSuffix(api.hostname)
  } catch {
    return false
  }
}
