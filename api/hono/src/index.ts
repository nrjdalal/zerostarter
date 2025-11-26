import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "@/lib/auth"

const app = new Hono().basePath("/api")

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
