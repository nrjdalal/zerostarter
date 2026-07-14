import { serve, upgradeWebSocket as nodeUpgradeWebSocket } from "@hono/node-server"
import { env } from "@packages/env/api-hono"
import type { Hono } from "hono"
import { upgradeWebSocket as bunUpgradeWebSocket, websocket } from "hono/bun"
import { WebSocketServer } from "ws"

import { withHostCookies } from "@/lib/host-cookie"

// Vercel Functions can't run Bun.serve(), so on Vercel we serve WebSockets through the Node adapter (@hono/node-server + ws); everywhere else (local, Docker/self-host) Bun.serve() owns the socket via hono/bun.
const onVercel = process.env.VERCEL === "1"

// Both adapters accept the same handler factory; the cast collapses their otherwise non-unionable signatures to one callable type. Registered on a route in index.ts.
export const upgradeWebSocket = onVercel
  ? (nodeUpgradeWebSocket as typeof bunUpgradeWebSocket)
  : bunUpgradeWebSocket

// On Vercel, return the Node http.Server so the platform drives all traffic including the WebSocket upgrade; it binds PORT when Vercel sets it, else HONO_PORT (e.g. forced locally). Elsewhere, return the Bun.serve() shape so Bun owns fetch + the socket.
export const createServer = (app: Hono) => {
  const port = process.env.PORT ? Number(process.env.PORT) : env.HONO_PORT
  // withHostCookies rewrites the __Secure-/__Host- cookie name at the server edge, so every route (auth handler, the /api/v1 session middleware, agent sign-in) reads and writes the cookie consistently.
  const fetch = withHostCookies(app.fetch)
  return onVercel
    ? serve({
        fetch,
        port,
        websocket: { server: new WebSocketServer({ noServer: true }) },
      })
    : {
        port,
        fetch,
        websocket,
      }
}
