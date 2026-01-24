import type { Session } from "@packages/auth"

import { headers } from "next/headers"

import { apiClient } from "@/lib/api/client"

export const auth = {
  api: {
    getSession: async () => {
      try {
        const response = await apiClient.auth["get-session"].$get(undefined, {
          headers: Object.fromEntries((await headers()).entries()),
        })
        if (!response.ok) return null
        const text = await response.text()
        if (!text) return null
        return JSON.parse(text) as Session | null
      } catch {
        return null
      }
    },
  },
}
