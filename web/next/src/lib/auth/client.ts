import { passkeyClient } from "@better-auth/passkey/client"
import {
  lastLoginMethodClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { config } from "@/lib/config"

export const authClient = createAuthClient({
  baseURL: `${config.api.url}/api/auth`,
  plugins: [
    lastLoginMethodClient(),
    magicLinkClient(),
    organizationClient({ teams: { enabled: true } }),
    passkeyClient(),
  ],
})
