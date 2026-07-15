import type { Session } from "@packages/auth"
import { deployMode } from "@packages/auth"
import { auth } from "@packages/auth"
import { db, verification } from "@packages/db"
import { eq, lt } from "drizzle-orm"
import { Hono } from "hono"
import { getCookie } from "hono/cookie"

import { ApiError } from "@/lib/error"
import { authMiddleware } from "@/middlewares"

// Cross-origin session handoff, mounted in split mode only (two apps on unrelated public-suffix origins). After OAuth completes on the api origin, /start parks the session cookie value under an opaque one-time id (verification table, 60s, single use) and bounces to the web origin, whose /api/handoff route claims it server-to-server and sets the cookie first-party. Shared-domain and host-only deployments never reach these routes: every request 404s exactly as if the router did not exist.
const HANDOFF_TTL_MS = 60_000

export const handoffRouter = new Hono<{
  Variables: Session
}>()
  .get("/start", authMiddleware, async (c) => {
    if (deployMode.kind !== "split") return c.notFound()

    const ctx = await auth.$context
    const cookieName = ctx.authCookies.sessionToken.name
    const value = getCookie(c, cookieName)
    if (!value) {
      throw new ApiError(401, "UNAUTHORIZED", "No session cookie to hand off")
    }
    const nonce = c.req.query("nonce")
    if (!nonce || nonce.length < 32) {
      throw new ApiError(400, "VALIDATION_ERROR", "Missing handoff nonce")
    }

    // Two UUIDs of entropy: the id is the whole secret, single-use and short-lived. The sweep keeps abandoned handoffs from accumulating; one indexed delete, no cron.
    const id = (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "")
    await db.delete(verification).where(lt(verification.expiresAt, new Date()))
    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: `handoff:${id}`,
      value: JSON.stringify({ name: cookieName, value, nonce }),
      expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
    })

    return c.redirect(`${deployMode.webOrigin}/api/handoff?id=${id}`, 302)
  })
  .post("/claim", async (c) => {
    if (deployMode.kind !== "split") return c.notFound()

    const body = (await c.req.json().catch(() => null)) as { id?: unknown } | null
    const id = body?.id
    if (typeof id !== "string" || id.length < 32) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid handoff id")
    }

    // Delete-returning makes the claim atomic and single-use: a replayed id finds nothing.
    const rows = await db
      .delete(verification)
      .where(eq(verification.identifier, `handoff:${id}`))
      .returning()
    const row = rows[0]
    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new ApiError(404, "NOT_FOUND", "Unknown or expired handoff")
    }

    return c.json({ data: JSON.parse(row.value) as { name: string; value: string; nonce: string } })
  })
