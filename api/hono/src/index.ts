import { Hono, type Context } from "hono"
import { cors } from "hono/cors"
import { auth } from "@/lib/auth"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"

const app = new Hono().basePath("/api")

app.use(
  "/auth/*",
  cors({
    origin: process.env.HONO_PUBLIC_ORIGINS ? process.env.HONO_PUBLIC_ORIGINS.split(",") : [],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
)

const routes = app
  .get("/health", (c) => {
    return c.text("OK")
  })
  .get(
    "/auth/get-session",
    zValidator(
      "query",
      z.object({
        select: z.string().optional(),
      }),
    ),
    async (c) => {
      const session = await (auth.api.getSession as any)({
        headers: c.req.raw.headers,
      })

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
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))

export type { User, Session } from "@/lib/auth"
export type AppType = typeof routes

export default {
  port: 4000,
  fetch: app.fetch,
}
