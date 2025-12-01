import { headers } from "next/headers"

import type { Session } from "@packages/auth"

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
