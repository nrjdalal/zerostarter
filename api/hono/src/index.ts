import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "@/lib/auth"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
  }
}>().basePath("/api")

app.use(
  "/auth/*",
  cors({
    origin: process.env.BETTER_AUTH_WEB_URL as string,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
)

app.get(
  "/auth/get-session",
  zValidator(
    "query",
    z.object({
      select: z.string().optional(),
    }),
  ),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session) {
      return c.json(null)
    }

    const { select } = c.req.valid("query")

    if (!select) {
      return c.json(session)
    }

    const selections = select.split(",")
    const result: Partial<typeof session> = {}

    if (selections.includes("user")) {
      result.user = session.user
    }

    if (selections.includes("session")) {
      result.session = session.session
    }

    return c.json(result)
  },
)

app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))

app.get("/", (c) => {
  return c.text("Hello Hono!")
})

export type { User, Session } from "@/lib/auth"
export type AppType = typeof app

export default {
  port: 4000,
  fetch: app.fetch,
}
