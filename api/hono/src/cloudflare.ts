import { app, routes } from "@/app"

export type AppType = typeof routes

export default {
  fetch: app.fetch,
}
