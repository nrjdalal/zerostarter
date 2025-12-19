import { magicLinkClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { config } from "@/lib/config"

export const authClient = createAuthClient({
  baseURL: `${config.api.url}/api/auth`,
  plugins: [magicLinkClient()],
})

export const { useSession, signIn, signUp, signOut, resetPassword } = authClient
