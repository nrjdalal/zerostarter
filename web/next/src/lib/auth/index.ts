import { headers } from "next/headers"

import { AppSession, AppUser } from "@api/hono"

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
      return response.json() as Promise<{ session: AppSession; user: AppUser } | null>
    },
  },
}
