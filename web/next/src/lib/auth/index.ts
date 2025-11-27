import { headers } from "next/headers"

import type { Session } from "@packages/auth"

import { authClient } from "@/lib/api/client"

export const auth = {
  api: {
    getSession: async () => {
      const response = await authClient["get-session"].$get(
        {},
        {
          headers: Object.fromEntries((await headers()).entries()),
        },
      )
      return response.json() as Promise<Session | null>
    },
  },
}
