import { definePackageConfig } from "@packages/config/tsdown"
import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/api-hono"
import { resolveCookieDomain } from "@packages/env/deploy"

// The build bakes only the Public Suffix List facts about the api's parent domain (tldts, a dev-only dependency of @packages/env, never ships): the domain string and whether browsers reject a Domain cookie there. The same-or-cross decision stays at runtime (@packages/auth/deploy), so env changes take effect on restart. Dev (bun --hot src) skips this define and auth derives the same domain string itself, minus the PSL veto.
const cookie = resolveCookieDomain(env.HONO_APP_URL)
console.log(
  `[deploy] api build: COOKIE_DOMAIN=${cookie.domain ?? "(none)"}${cookie.isPublicSuffix ? " (public suffix: cross-site sign-in)" : ""}`,
)

export default definePackageConfig({
  name: "@api/hono",
  env,
  getSafeEnv,
  define: {
    ...(cookie.domain ? { "process.env.COOKIE_DOMAIN": JSON.stringify(cookie.domain) } : {}),
    "process.env.COOKIE_DOMAIN_PUBLIC_SUFFIX": JSON.stringify(String(cookie.isPublicSuffix)),
  },
  deps: { alwaysBundle: [/^@packages\//], neverBundle: ["bun"] },
})
