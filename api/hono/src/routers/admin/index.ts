import type { Session } from "@packages/auth"
import { Hono } from "hono"

import { consoleAdminMiddleware } from "@/middlewares"
import { activityRouter } from "@/routers/admin/activity"
import { allowlistRouter } from "@/routers/admin/allowlist"
import { usersRouter } from "@/routers/admin/users"
import { waitlistRouter } from "@/routers/admin/waitlist"

// Console endpoints, mounted under /v1 behind authMiddleware; the console gate layers the fresh rank check on top. Every route here is a console surface for admins, whether that is who reaches the console, the rules that let them, the trail of those changes, or the waitlist, so the whole router requires admin rather than the console's lower rung.
// One file per resource, mounted in the order the routes were declared before they were split, since each resource's own feature gate has to stay above its routes.
export const adminRouter = new Hono<{
  Variables: Session
}>()
  .use("/*", consoleAdminMiddleware)
  .route("/", usersRouter)
  .route("/", activityRouter)
  .route("/", allowlistRouter)
  .route("/", waitlistRouter)
