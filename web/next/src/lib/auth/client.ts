import { magicLinkClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const { signIn, signOut, useSession } = createAuthClient({
  plugins: [magicLinkClient()],
})
