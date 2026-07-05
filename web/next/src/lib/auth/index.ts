import type { Session } from "@packages/auth"
import { getRequest } from "@tanstack/react-start/server"

import { apiClient } from "@/lib/api/client"

export const auth = {
  api: {
    getSession: async (opts?: { disableCookieCache?: boolean }) => {
      try {
        const url = apiClient.auth["get-session"].$url()
        // Bypass the 300s session cookie cache so a just-changed role takes effect immediately (used by the console gate).
        if (opts?.disableCookieCache) url.searchParams.set("disableCookieCache", "true")
        const response = await fetch(url, {
          // The incoming request's headers (cookies included), read from Start's server context instead of next/headers.
          headers: Object.fromEntries(getRequest().headers.entries()),
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
