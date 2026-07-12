import { features, type Feature } from "@packages/config/site"
import type { MiddlewareHandler } from "hono"

// 404 a route when its feature flag is off. Apply with .use() so the route stays mounted (AppType is unchanged) and a fork can flip the flag on later without a code change.
export const requireFeature =
  (flag: Feature): MiddlewareHandler =>
  async (c, next) => {
    if (!features[flag]) return c.notFound()
    await next()
  }
