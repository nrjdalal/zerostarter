import type { Session } from "@packages/auth"

import { headers } from "next/headers"

import { apiClient } from "@/lib/api/client"

export const auth = {
  api: {
    getSession: async () => {
      const response = await apiClient.auth["get-session"].$get(
        {},
        {
          headers: Object.fromEntries((await headers()).entries()),
        },
      )
      return response.json() as Promise<Session | null>
    },
  },
}
