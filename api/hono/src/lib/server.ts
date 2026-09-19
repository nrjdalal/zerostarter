import { env } from "@packages/env/api-hono"
import type { Hono } from "hono"
import { upgradeWebSocket, websocket } from "hono/bun"

// SPIKE (variant A): one socket owner everywhere. Bun.serve() owns fetch and the socket through hono/bun on every host, Vercel included, now that its Bun runtime documents a native Bun.serve() WebSocket path.
export { upgradeWebSocket }

// The Bun.serve() shape. Honors process.env.PORT when set (Vercel, or portless assigning a dev port), else HONO_PORT.
export const createServer = (app: Hono) => ({
  fetch: app.fetch,
  port: process.env.PORT ? Number(process.env.PORT) : env.HONO_PORT,
  websocket,
})
