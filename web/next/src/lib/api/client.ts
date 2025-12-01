import type { AppType } from "@api/hono"
import { env } from "@packages/env"
import { hc } from "hono/client"

type Client = ReturnType<typeof hc<AppType>>

const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args)

const url =
  typeof window === "undefined" && env.INTERNAL_API_URL
    ? env.INTERNAL_API_URL
    : env.NEXT_PUBLIC_API_URL

const honoClient = hcWithType(url, {
  init: {
    credentials: "include",
  },
})

export const apiClient = honoClient.api
