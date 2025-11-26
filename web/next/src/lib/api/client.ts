import type { AppType } from "@api/hono"
import { hc } from "hono/client"

// TODO: Validate if this is the correct way to create the client
export const honoClient = hc<AppType>(process.env.NEXT_PUBLIC_API_URL as string, {
  fetch: (input: string | Request | URL, init: RequestInit | undefined) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
}) as AppType
