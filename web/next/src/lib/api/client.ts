import type { AppType } from "@api/hono"
import { hc } from "hono/client"

type Client = ReturnType<typeof hc<AppType>>

const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args)

const honoClient = hcWithType(process.env.NEXT_PUBLIC_API_URL as string, {
  init: {
    credentials: "include",
  },
})

export const apiClient = honoClient.api
export const authClient = honoClient.api.auth
export const usersClient = honoClient.api.v1
