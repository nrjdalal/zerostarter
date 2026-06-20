import type { Session } from "@packages/auth"
import { headers } from "next/headers"

import { apiClient } from "@/lib/api/client"

export const auth = {
  api: {
    getSession: async (opts?: { disableCookieCache?: boolean }) => {
      try {
        const url = apiClient.auth["get-session"].$url()
        // Bypass the 300s session cookie cache so a just-changed role takes effect immediately (used by the console gate).
        if (opts?.disableCookieCache) url.searchParams.set("disableCookieCache", "true")
        const response = await fetch(url, {
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
