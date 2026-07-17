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
        // Forward the cookie only. Forwarding every incoming header sends the web app's own Host (and x-forwarded-host) to the api, which Vercel routes/validates by Host, so the call can come back 403 and read as a lost session. x-forwarded-for is deliberately not forwarded either: at this hop it is client-controlled, and the api's findIp reads the rightmost public IP (the web function's egress on Vercel) regardless, so forwarding it cannot fix rate-limit keying and only launders a spoofable value. Cookie-only is the idiom every other server-side api call here uses.
        const cookie = (await headers()).get("cookie") ?? ""
        const response = await fetch(url, {
          headers: { cookie },
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
