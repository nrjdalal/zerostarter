import { sValidator } from "@hono/standard-validator"
import { auth, deployMode, type Session } from "@packages/auth"
import { db, verification } from "@packages/db"
import { and, eq, like, lt } from "drizzle-orm"
import { Hono } from "hono"
import { getCookie } from "hono/cookie"
import { z } from "zod"

import { ApiError } from "@/lib/error"
import { authMiddleware } from "@/middlewares"

// Cross-origin session handoff, live in split mode only (two apps on unrelated public-suffix origins). After OAuth completes on the api origin, /start parks the session cookie value under an opaque one-time id (verification table, 60s, single use, bound to the caller's nonce) and bounces to the web origin, whose /api/handoff route claims it server-to-server and sets the cookie first-party. Shared-domain and host-only deployments never reach these routes: the mode gate below 404s every request before auth even runs, exactly as if the router did not exist.
const HANDOFF_TTL_MS = 60_000
const HANDOFF_ID_PREFIX = "handoff:"
// Empty outside split mode, where the mode gate 404s before any handler runs, so it is only ever read as the real web origin.
const webOrigin = deployMode.kind === "split" ? deployMode.webOrigin : ""

// The whole secret is the id plus the nonce, so both must be long and single-use.
const claimSchema = z.object({
  id: z.string().min(32),
  nonce: z.string().min(32),
})

export const handoffRouter = new Hono<{ Variables: Session }>()
  // Mode gate first, ahead of authMiddleware: outside split mode every handoff request 404s as if the router were never mounted (it stays mounted so AppType is stable across deploy shapes).
  .use("*", async (c, next) => {
    if (deployMode.kind !== "split") return c.notFound()
    await next()
  })
  .get("/start", authMiddleware, async (c) => {
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

    // The id travels in the redirect URL, so it is not secret-grade; the nonce is the initiating browser's first-party cookie and is folded into the row's identifier, so only a caller presenting both the id and the nonce can claim. The parked expiry lets the web mint a cookie matching the real session lifetime, not a guessed one.
    const id = (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "")
    const { expiresAt } = c.get("session")
    // Opportunistic cleanup of abandoned handoffs only, scoped to handoff rows so magic-link and email-verification rows are never swept. The prefix LIKE seq-scans on a default-collation column, but the verification table is tiny and this runs once per sign-in.
    await db
      .delete(verification)
      .where(
        and(
          like(verification.identifier, `${HANDOFF_ID_PREFIX}%`),
          lt(verification.expiresAt, new Date()),
        ),
      )
    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: `${HANDOFF_ID_PREFIX}${id}:${nonce}`,
      value: JSON.stringify({ name: cookieName, value, expiresAt }),
      expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
    })

    return c.redirect(`${webOrigin}/api/handoff?id=${id}`, 302)
  })
  .post(
    "/claim",
    sValidator("json", claimSchema, (result) => {
      if (!result.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Invalid handoff claim", {
          issues: result.error,
        })
      }
    }),
    async (c) => {
      const { id, nonce } = c.req.valid("json")
      // Atomic single-use claim: the nonce is folded into the identifier, so the DELETE matches only when the caller presents both the id and the initiating browser's nonce. A wrong nonce forms a different identifier and matches nothing, so the row survives (no self-inflicted DoS) and a leaked id alone gets nothing. Plain identifier equality keeps the claim on the index with no json cast of the shared verification.value column.
      const rows = await db
        .delete(verification)
        .where(eq(verification.identifier, `${HANDOFF_ID_PREFIX}${id}:${nonce}`))
        .returning()
      const row = rows[0]
      if (!row || row.expiresAt.getTime() < Date.now()) {
        throw new ApiError(404, "NOT_FOUND", "Unknown or expired handoff")
      }
      const parked = JSON.parse(row.value) as { name: string; value: string; expiresAt: string }
      return c.json({
        data: { name: parked.name, value: parked.value, expiresAt: parked.expiresAt },
      })
    },
  )
