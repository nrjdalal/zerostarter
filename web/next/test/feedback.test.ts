/**
 * Feedback (USERJOT) conditional rendering — surfaced by the zerostarter
 * feedback doc. A Feedback link appears in BOTH the docs sidebar footer and the
 * dashboard user menu iff NEXT_PUBLIC_USERJOT_URL is set, and nowhere when it is
 * unset. We read the configured value (@packages/env loads the root .env) and
 * assert the absolute presence in each location — so both-wrongly-absent is
 * caught, not just disagreement between them.
 */

import { beforeAll, describe, expect, test } from "bun:test"

import { env } from "@packages/env/web-next"

import { get, signInAsAgent } from "./helpers"

const FEEDBACK_CONFIGURED = Boolean(env.NEXT_PUBLIC_USERJOT_URL)

let docsFeedback = false
let dashFeedback = false
let feedbackHref: string | undefined

beforeAll(async () => {
  const docsHtml = await (await get("/docs")).text()
  docsFeedback = docsHtml.includes(">Feedback<")
  feedbackHref = docsHtml.match(/<a[^>]+href="([^"]+)"[^>]*>\s*<span>Feedback/)?.[1]

  const cookie = await signInAsAgent()
  const dashHtml = await (await get("/dashboard", { headers: { cookie } })).text()
  dashFeedback = dashHtml.includes(">Feedback")
  // explicit hook timeout: setDefaultTimeout covers tests but not hooks, and
  // this setup makes several requests that can hit the 429 retry budget under
  // concurrent test-file load
}, 30_000)

describe("feedback conditional", () => {
  test("docs sidebar footer always shows the version", async () => {
    const html = await (await get("/docs")).text()
    expect(html).toMatch(/text-muted-foreground[^>]*>v(<!-- -->)?[\d.]/)
  })

  test(`docs footer feedback link is ${FEEDBACK_CONFIGURED ? "present" : "absent"} (matches NEXT_PUBLIC_USERJOT_URL)`, () => {
    expect(docsFeedback).toBe(FEEDBACK_CONFIGURED)
  })

  test(`dashboard menu feedback link is ${FEEDBACK_CONFIGURED ? "present" : "absent"} (matches NEXT_PUBLIC_USERJOT_URL)`, () => {
    expect(dashFeedback).toBe(FEEDBACK_CONFIGURED)
  })

  test("a configured feedback link points to the external https URL", () => {
    if (!FEEDBACK_CONFIGURED) return // nothing rendered when unset
    expect(feedbackHref).toBe(env.NEXT_PUBLIC_USERJOT_URL)
    expect(feedbackHref).toStartWith("http")
  })
})
