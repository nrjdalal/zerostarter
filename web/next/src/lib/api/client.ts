import type { AppType } from "@api/hono"

import { hc } from "hono/client"

import { config } from "@/lib/config"

type Client = ReturnType<typeof hc<AppType>>

const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args)

const url = config.api.internalUrl ? config.api.internalUrl : config.api.url

const honoClient = hcWithType(url, {
  init: {
    credentials: "include",
  },
})

export const apiClient = honoClient.api
