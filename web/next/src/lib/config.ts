import { BUILD_VERSION } from "@packages/env"
import { env } from "@packages/env/web-next"

// The base for API requests. Browser: the app's OWN origin, so the Next `/api/*` rewrite proxies to the API and the host-only session cookie stays on the web origin (no cross-env leakage). Server (RSC/SSR): the API directly, no proxy hop.
const getApiBase = () => {
  if (typeof window === "undefined") return env.INTERNAL_API_URL || env.NEXT_PUBLIC_API_URL
  return window.location.origin
}

export const config = {
  // Runtime / env-derived app values (NOT brand, brand lives in @packages/config/site)
  app: {
    url: env.NEXT_PUBLIC_APP_URL,
    version: BUILD_VERSION,
  },

  // API configuration
  api: {
    // Where API requests are sent (browser: same-origin via the /api proxy; server: the API directly).
    base: getApiBase(),
    // The API's own absolute origin, for the cross-origin health WebSocket (which can't ride the same-origin proxy).
    url: env.NEXT_PUBLIC_API_URL,
  },
} as const
