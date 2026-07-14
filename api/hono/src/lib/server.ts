import { serve, upgradeWebSocket as nodeUpgradeWebSocket } from "@hono/node-server"
import { env } from "@packages/env/api-hono"
import type { Hono } from "hono"
import { upgradeWebSocket as bunUpgradeWebSocket, websocket } from "hono/bun"
import { WebSocketServer } from "ws"

// Vercel Functions can't run Bun.serve(), so on Vercel we serve WebSockets through the Node adapter (@hono/node-server + ws); everywhere else (local, Docker/self-host) Bun.serve() owns the socket via hono/bun.
const onVercel = process.env.VERCEL === "1"

// Both adapters accept the same handler factory; the cast collapses their otherwise non-unionable signatures to one callable type. Registered on a route in index.ts.
export const upgradeWebSocket = onVercel
  ? (nodeUpgradeWebSocket as typeof bunUpgradeWebSocket)
  : bunUpgradeWebSocket

// On Vercel, return the Node http.Server so the platform drives all traffic including the WebSocket upgrade; elsewhere return the Bun.serve() shape so Bun owns fetch + the socket. Both honor process.env.PORT when set (Vercel, or portless assigning a dev port), else HONO_PORT.
export const createServer = (app: Hono) => {
  const port = process.env.PORT ? Number(process.env.PORT) : env.HONO_PORT
  return onVercel
    ? serve({
        fetch: app.fetch,
        port,
        websocket: { server: new WebSocketServer({ noServer: true }) },
      })
    : {
        fetch: app.fetch,
        port,
        websocket,
      }
}
