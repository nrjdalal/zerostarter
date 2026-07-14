import { magicLinkClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { config } from "@/lib/config"

export const authClient = createAuthClient({
  // Same-origin: in the browser config.api.url is the app's own origin, so auth calls hit `<web-origin>/api/auth` and ride the Next `/api` proxy to the API. Do NOT switch this to NEXT_PUBLIC_API_URL (cross-origin) or the host-only session cookie won't be sent.
  baseURL: `${config.api.url}/api/auth`,
  plugins: [magicLinkClient(), organizationClient({ teams: { enabled: true } })],
})
