import { sValidator } from "@hono/standard-validator"
import { auth, deployMode, type Session } from "@packages/auth"
import { Hono } from "hono"
import { getCookie } from "hono/cookie"
import { z } from "zod"

import { ApiError } from "@/lib/error"
import { authMiddleware } from "@/middlewares"

// Cross-origin session handoff, live in split mode only (two apps on unrelated public-suffix origins). After OAuth completes on the api origin, /start parks the session-cookie value under a one-time id and bounces to the web origin, whose /api/handoff route claims it server-to-server and sets the cookie first-party. Storage goes through Better Auth's own verification adapter, the same primitive its one-time-token plugin uses, so there is no bespoke SQL to drift from the framework. Shared-domain and host-only deployments never reach these routes: the mode gate below 404s every request before auth even runs.
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

    // The id travels in the redirect URL, so it is not secret-grade; the nonce is the initiating browser's first-party cookie, folded into the row identifier so only a caller presenting both can claim. The parked expiry lets the web mint a cookie matching the real session lifetime, not a guessed one.
    const id = (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "")
    const { expiresAt } = c.get("session")
    await ctx.internalAdapter.createVerificationValue({
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
      const ctx = await auth.$context
      // Atomic single-use consume via Better Auth's adapter: it validates, deletes, and re-checks expiry in one locked transaction, and only the first concurrent caller wins. A wrong nonce forms a different identifier and consumes nothing, so the row survives (no self-inflicted DoS) and a leaked id alone gets nothing.
      const consumed = await ctx.internalAdapter.consumeVerificationValue(
        `${HANDOFF_ID_PREFIX}${id}:${nonce}`,
      )
      if (!consumed) {
        throw new ApiError(404, "NOT_FOUND", "Unknown or expired handoff")
      }
      const parked = JSON.parse(consumed.value) as {
        name: string
        value: string
        expiresAt: string
      }
      return c.json({
        data: { name: parked.name, value: parked.value, expiresAt: parked.expiresAt },
      })
    },
  )
