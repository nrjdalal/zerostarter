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
        // Forward the cookie, plus the client IP. Forwarding every incoming header sends the web app's own Host (and x-forwarded-host) to the api, which Vercel routes/validates by Host, so the call can come back 403 and read as a lost session. But x-forwarded-for is safe and load-bearing: without it the api rate-limits by the caller's IP, so every SSR session check on one function instance keys under that instance's own IP and a burst of renders can 429 itself into an apparent logout. Pass the real client IP so keying stays per-user.
        const incoming = await headers()
        const cookie = incoming.get("cookie") ?? ""
        const forwardedFor = incoming.get("x-forwarded-for")
        const response = await fetch(url, {
          headers: { cookie, ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}) },
          cache: "no-store",
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
