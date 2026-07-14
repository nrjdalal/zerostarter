import { magicLinkClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { config } from "@/lib/config"

export const authClient = createAuthClient({
  // Same-origin: config.api.base is the app's own origin in the browser, so auth rides the `/api` proxy and the host-only cookie is sent. Do not point this at the cross-origin API URL.
  baseURL: `${config.api.base}/api/auth`,
  plugins: [magicLinkClient(), organizationClient({ teams: { enabled: true } })],
})
