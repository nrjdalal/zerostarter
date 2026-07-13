import { magicLinkClient, organizationClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { config } from "@/lib/config"

export const authClient = createAuthClient({
  // Same-origin: the browser calls the web host's /api/auth, which Next rewrites to the API. This keeps the
  // session cookie host-only on the web host (never sent cross-origin to the api host or to sibling envs).
  baseURL: `${config.app.url}/api/auth`,
  plugins: [magicLinkClient(), organizationClient({ teams: { enabled: true } })],
})
