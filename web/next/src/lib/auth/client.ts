import { env } from "@packages/env"
import { magicLinkClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: `${env.NEXT_PUBLIC_API_URL}/api/auth`,
  plugins: [magicLinkClient()],
})

export const { useSession, signIn, signUp, signOut, resetPassword } = authClient
