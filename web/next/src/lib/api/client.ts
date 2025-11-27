import type { AppType } from "@api/hono"
import { env } from "@packages/env"
import { hc } from "hono/client"

type Client = ReturnType<typeof hc<AppType>>

const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args)

const honoClient = hcWithType(env.NEXT_PUBLIC_API_URL, {
  init: {
    credentials: "include",
  },
})

export const apiClient = honoClient.api
export const authClient = honoClient.api.auth
