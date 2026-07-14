import { BUILD_VERSION } from "@packages/env"
import { env } from "@packages/env/web-next"

// The API base the app talks to. In the browser it is the app's OWN origin, so the Next `/api/*` rewrite proxies to the API and the host-only session cookie binds to the web origin (no cross-subdomain cookie, no cross-env leakage). On the server (RSC/SSR) it goes straight to the API, skipping the proxy hop.
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
    url: getApiBase(),
    // Absolute API origin, for the cross-origin health WebSocket (a host-only cookie can't ride the same-origin proxy, and the socket is unauthenticated).
    publicUrl: env.NEXT_PUBLIC_API_URL,
  },
} as const
