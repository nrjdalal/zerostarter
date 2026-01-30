import type { Session } from "@packages/auth"

import { Hono } from "hono"

import { authMiddleware, errorHandler } from "@/middlewares"
import { organizationRouter } from "@/routers/organization"
import { organizationsRouter } from "@/routers/organizations"
import { sessionRouter } from "@/routers/session"

const app = new Hono<{
  Variables: Session
}>()

app.use("/*", authMiddleware)
app.onError(errorHandler)

export const v1Router = app
  .route("/session", sessionRouter)
  .route("/organization", organizationRouter)
  .route("/organizations", organizationsRouter)
