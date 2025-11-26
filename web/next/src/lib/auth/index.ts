import { AppType, Session as AuthSession, User as AuthUser } from "@api/hono"
import { hc } from "hono/client"

const honoClient = hc<AppType>(process.env.NEXT_PUBLIC_API_URL as string) as AppType & {
  api: {
    auth: {
      "get-session": {
        $get: (args: {}, init: { init: RequestInit }) => Promise<Response>
      }
    }
  }
}

export const auth = {
  api: {
    getSession: async ({
      headers,
    }: {
      headers: Headers
    }): Promise<{ user: AuthUser; session: AuthSession } | null> => {
      try {
        const response = await honoClient.api.auth["get-session"].$get(
          {},
          {
            init: {
              headers,
            },
          },
        )
        if (!response.ok) return null
        return (await response.json()) as { user: AuthUser; session: AuthSession }
      } catch (error) {
        console.error(error)
        return null
      }
    },
  },
}
