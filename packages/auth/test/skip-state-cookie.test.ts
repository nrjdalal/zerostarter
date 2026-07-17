import { expect, test } from "bun:test"

import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"

// Split mode's cross-browser fix rests on account.skipStateCookieCheck reaching Better Auth's runtime oauth config (A/B-proven load-bearing on Safari, PR #720). Pin the option's plumbing on the pinned better-auth version, so an upgrade that renames or drops it fails here instead of in production sign-in.
test("account.skipStateCookieCheck reaches the runtime oauth config", async () => {
  const make = (skip: boolean) =>
    betterAuth({
      baseURL: "https://myapp-api.vercel.app",
      secret: "test-secret-test-secret-test-secret",
      database: memoryAdapter({}),
      ...(skip && { account: { skipStateCookieCheck: true } }),
    })
  const withSkip = await make(true).$context
  expect(withSkip.oauthConfig?.skipStateCookieCheck).toBe(true)
  const without = await make(false).$context
  expect(without.oauthConfig?.skipStateCookieCheck).toBeFalsy()
})
