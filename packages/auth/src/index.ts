import {
  account,
  db,
  invitation,
  member,
  organization,
  session,
  team,
  teamMember,
  user,
  verification,
} from "@packages/db"
import { env } from "@packages/env/auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import {
  admin as adminPlugin,
  openAPI as openAPIPlugin,
  organization as organizationPlugin,
} from "better-auth/plugins"

import { resolveDeployMode } from "@/deploy"
import { getCookieDomain, getCookiePrefix } from "@/lib/utils"

// The deployment shape, decided once at module init from env the api already validates. The build bakes only the Public Suffix List facts (COOKIE_DOMAIN and its verdict, see @packages/env/deploy; unset when running from source, where the same string derivation runs here instead and the PSL veto is simply unavailable); same-or-cross is then plain string work, so an env change takes effect on restart with no rebuild. Everything conditional (cookie attributes, the session handoff) branches on this value, never on env at request time, so a deployment on one shared domain runs byte-identical code to a template without split support at all.
export const deployMode = resolveDeployMode(
  {
    domain: env.COOKIE_DOMAIN ?? getCookieDomain(env.HONO_APP_URL),
    isPublicSuffix: env.COOKIE_DOMAIN_PUBLIC_SUFFIX,
  },
  env.HONO_APP_URL,
  env.HONO_TRUSTED_ORIGINS,
)
const cookiePrefix = getCookiePrefix(env.HONO_APP_URL)

// The one drift the fact-bake leaves: HONO_APP_URL changed since the build, so the baked domain no longer matches what this env would derive. A rebuild re-bakes it.
if (env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== getCookieDomain(env.HONO_APP_URL)) {
  console.warn(
    `[auth] COOKIE_DOMAIN=${env.COOKIE_DOMAIN} was baked from a different HONO_APP_URL than the runtime one; rebuild the api so the baked cookie facts match.`,
  )
}

if (deployMode.kind === "split") {
  const api = new URL(env.HONO_APP_URL)
  // The web origin is the first trusted origin on a different host from the api. HONO_TRUSTED_ORIGINS is a CORS allowlist that can hold several, so warn when more than one distinct host is trusted: the inference could pick the wrong site (not a leak, the nonce cookie lives on the real web origin, but a baffling misroute).
  const webHosts = new Set(
    env.HONO_TRUSTED_ORIGINS.map((origin) => {
      try {
        return new URL(origin).hostname
      } catch {
        return ""
      }
    }).filter((host) => host && host !== api.hostname),
  )
  if (webHosts.size > 1) {
    console.warn(
      `[auth] split mode treats the first non-api HONO_TRUSTED_ORIGINS entry as the web origin (${deployMode.webOrigin}), but ${webHosts.size} distinct non-api hosts are trusted. List the web origin first if that is not it.`,
    )
  }
  console.log(
    `[auth] split deploy: ${api.origin} and ${deployMode.webOrigin} cannot share cookies; sign-in routes through the session handoff.`,
  )
}

export type SocialProvider = "github" | "google"
export type AuthProvider = SocialProvider | "magic-link"

// A provider is enabled only when both of its OAuth credentials are set; a fork can ship with any subset (or none, relying on magic link).
export const enabledSocialProviders: SocialProvider[] = [
  ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? (["github"] as const) : []),
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? (["google"] as const) : []),
]

export const auth = betterAuth({
  baseURL: env.HONO_APP_URL,
  trustedOrigins: env.HONO_TRUSTED_ORIGINS,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      account,
      invitation,
      member,
      organization,
      session,
      team,
      teamMember,
      user,
      verification,
    },
  }),
  onAPIError: {
    throw: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 300,
    },
  },
  plugins: [
    openAPIPlugin(),
    organizationPlugin({
      teams: { enabled: true },
    }),
    adminPlugin(),
  ],
  socialProviders: {
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
      : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
  },
  advanced: {
    ...(cookiePrefix && { cookiePrefix }),
    // Shared domain (custom domains, portless localhost): today's cross-subdomain cookies, byte-identical.
    ...(deployMode.kind === "shared" && {
      crossSubDomainCookies: {
        enabled: true,
        domain: deployMode.cookieDomain,
      },
    }),
    // Split (two apps that cannot share a cookie domain): host-only SameSite=None, the only attributes browsers store across two unrelated sites.
    ...(deployMode.kind === "split" && {
      defaultCookieAttributes: {
        sameSite: "none" as const,
        secure: true,
      },
    }),
  },
  // In split mode the OAuth `state` cookie is written by the api on a cross-site fetch response (signIn.social posts, then does a top-level redirect), which Safari (ITP) blocks and Firefox partitions, so it is absent on the first-party provider callback and sign-in dies with state_mismatch before the handoff runs. Skip the state COOKIE check: with a server session store the state is also persisted in the DB (single-use CSPRNG, deleted on parse), which stays the CSRF binding. This is what Better Auth's own oauth-proxy plugin does for the cross-origin case.
  // Accepted tradeoff: the DB state is single-use but not browser-bound, so a relayed OAuth callback can still set the api-origin session in another browser (a bounded login-CSRF on the api-origin cookie, mostly Chrome third-party cookies; the nonce handoff still protects the web-origin SSR cookie). Known split-mode tradeoff; the tighter binding is deferred, see .github/notes/plans/split-oauth-callback-binding.md.
  ...(deployMode.kind === "split" && { account: { skipStateCookieCheck: true } }),
})

// Magic-link sign-in shows in the UI only when its server plugin is registered; add `magicLink({ sendMagicLink })` to the plugins above (and implement the sender) to enable it.
export const magicLinkEnabled = (auth.options.plugins ?? []).some(
  (p) => (p.id as string) === "magic-link",
)

// The unified list of enabled sign-in providers the UI reads: social providers plus magic link when its server plugin is registered.
export const enabledProviders: AuthProvider[] = [
  ...enabledSocialProviders,
  ...(magicLinkEnabled ? (["magic-link"] as const) : []),
]

export type Session = typeof auth.$Infer.Session
