import { Hono } from "hono"
import { hc } from "hono/client"
import { z } from "zod"

import { jsonBody } from "@/lib/route"

// Compile-time guard for the Hono RPC typed client, the end-to-end type pipeline this starter is built on. jsonBody validates with hono-openapi's validator, which regressed RPC type inference in a pre-1.x release (why validation lived on @hono/standard-validator's sValidator for a while); this pins the property that a validated route still yields a strictly-typed client. A hono-openapi bump that loosens inference fails check-types here instead of silently degrading every typed API call. Self-contained: a throwaway app, so it never references a real route and survives deleting any of them. Never imported, so it ships no runtime code.
const guardApp = new Hono().post(
  "/guard",
  jsonBody(z.object({ email: z.string() }), "invalid"),
  (c) => c.json({ email: c.req.valid("json").email }),
)

const guardClient = hc<typeof guardApp>("http://guard")

// If any assertion below stops erroring, a hono-openapi bump loosened RPC inference: revert jsonBody to sValidator (see the api-endpoint skill).
async function assertStrictlyTypedClient() {
  // @ts-expect-error the json body is required
  await guardClient.guard.$post({})
  // @ts-expect-error email must be a string
  await guardClient.guard.$post({ json: { email: 1 } })
  await guardClient.guard.$post({ json: { email: "you@example.com" } })
}

void assertStrictlyTypedClient
