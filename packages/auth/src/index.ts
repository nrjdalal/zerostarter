import { features } from "@packages/config/site"
import {
  account,
  allowlist,
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
import { userAc } from "better-auth/plugins/admin/access"
import { and, eq, inArray, isNull, or } from "drizzle-orm"

import { matchesAllowlist, roleAtLeast, type AllowlistRule } from "@/access"
import { cookieConfig, localhostHost, type ParsedHost } from "@/lib/utils"

// The app host's tldts breakdown, inlined at build by @packages/scripts/src/generate-env.ts (see tsdown.config.ts define), so no Public Suffix List ships at runtime. A runtime .localhost host (portless dev, injected after the build) overrides it so web and api share the cookie.
declare const __DERIVED_TLDTS__: ParsedHost
const { cookieDomain, cookiePrefix, isPrivate } = cookieConfig(
  localhostHost(env.HONO_APP_URL) ?? __DERIVED_TLDTS__,
)

// On a public hosting suffix (isPrivate) web and api are sibling sites that cannot share a cookie, so the browser only ever talks to the web, which proxies /api to us and Better Auth builds OAuth callbacks and cookies for the web origin. Everything stays first-party to the web: no cross-site cookie, no handoff.
const apiOrigin = new URL(env.HONO_APP_URL).origin
const nonApiOrigins = [
  ...new Set(
    env.HONO_TRUSTED_ORIGINS.map((o) => {
      try {
        return new URL(o).origin
      } catch {
        return ""
      }
    }).filter((o) => o && o !== apiOrigin),
  ),
]
const webOrigin = isPrivate
  ? env.HONO_WEB_URL
    ? new URL(env.HONO_WEB_URL).origin
    : nonApiOrigins[0]
  : undefined

// HONO_WEB_URL names the web origin explicitly. Without it, a public-suffix host infers the first non-api HONO_TRUSTED_ORIGINS entry: with none distinct from the api, baseURL falls back to the api and cross-origin OAuth cannot complete; with several, it pins to whichever is listed first. Warn either way and point at HONO_WEB_URL.
if (isPrivate && !env.HONO_WEB_URL && nonApiOrigins.length === 0) {
  console.warn(
    `[auth] HONO_APP_URL is a public-suffix host but no HONO_TRUSTED_ORIGINS entry differs from it, so baseURL falls back to the api and sign-in cannot complete (cross-origin OAuth will fail). Set HONO_WEB_URL to your web origin, or use a custom domain.`,
  )
} else if (isPrivate && !env.HONO_WEB_URL && nonApiOrigins.length > 1) {
  console.warn(
    `[auth] inferred the web origin as the first non-api HONO_TRUSTED_ORIGINS entry (${webOrigin}), but ${nonApiOrigins.length} distinct non-api origins are trusted. Set HONO_WEB_URL to pin it explicitly.`,
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
  baseURL: webOrigin ?? env.HONO_APP_URL,
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
  databaseHooks: {
    session: {
      create: {
        // Signing up and using the dashboard is open to everyone; the allowlist is only about the console. On each sign-in a matching address is lifted to the console's bottom rung, so adding a domain covers colleagues who already have accounts rather than only future ones.
        before: async (session) => {
          if (!features.allowlist) return
          // An impersonation session is an admin acting as someone, not that person signing in, and a grant made from it would outlive the impersonation.
          if (session.impersonatedBy) return
          // Best effort on purpose: this sits on the sign-in path, so a database hiccup here must not stop anyone signing in. A missed grant is repaired by the next sign-in; a thrown error would lock every account out of the app.
          try {
            // Read through our own schema rather than the adapter: role is our column, added by the admin plugin, and not on Better Auth's base user type.
            const [signingIn] = await db
              .select({ email: user.email, id: user.id, role: user.role })
              .from(user)
              .where(eq(user.id, session.userId))
              .limit(1)
            // Never lowers anyone: an admin or owner keeps their rung, and a hand-granted role is untouched by a rule edit.
            if (!signingIn || roleAtLeast(signingIn.role, "member")) return
            // Only the two rows that could possibly match, not the table: this runs on the sign-in path for every ordinary account, and the allowlist has no bound. Values are normalized lowercase when written, which is what makes an exact match correct here; matchesAllowlist still decides, so the parsing and matching semantics stay in the tested seam.
            const address = signingIn.email.trim().toLowerCase()
            const at = address.lastIndexOf("@")
            if (at < 1) return
            const candidates = await db
              .select({ kind: allowlist.kind, value: allowlist.value })
              .from(allowlist)
              .where(inArray(allowlist.value, [address, address.slice(at)]))
            // kind is a text column, so narrow rather than cast: a row with anything else in it is not a rule this understands.
            const rules = candidates.filter(
              (rule): rule is AllowlistRule => rule.kind === "domain" || rule.kind === "email",
            )
            if (!matchesAllowlist(signingIn.email, rules)) return
            // Conditional on the rung read above still holding: a promotion landing between that read and this write would otherwise be undone by a sign-in that happened to race it.
            await db
              .update(user)
              .set({ role: "member" })
              .where(and(eq(user.id, signingIn.id), or(isNull(user.role), eq(user.role, "user"))))
          } catch (error) {
            console.error("allowlist grant failed during sign-in:", error)
          }
        },
      },
    },
  },
  plugins: [
    openAPIPlugin(),
    organizationPlugin({
      teams: { enabled: true },
    }),
    // The plugin validates adminRoles against its own role table, so the ladder's rungs are declared here as well as ranked in @/access.
    // Every rung holds no statements, which is deliberate and load-bearing. The plugin mounts its own endpoints at /api/auth/admin/*, and its middleware authorizes on these statements alone: it has no notion of rank, of who the actor is relative to the target, or of the last owner. Hand an admin the stock adminAc and one request to /api/auth/admin/set-role makes them an owner, bans an owner, or resets an owner's password, and every rule in @/access becomes a comment. Verified: it did exactly that before this was narrowed.
    // So the console's own routes own all of it, guarded by refuseRoleChange and refuseBan, and the plugin keeps only what nothing else provides: the role, banned, banReason and banExpires columns, and the session check that refuses a banned user. A fork that wants the plugin's endpoints should widen one statement at a time and accept that the ladder does not constrain them.
    adminPlugin({
      adminRoles: ["owner", "admin"],
      roles: {
        admin: userAc,
        member: userAc,
        owner: userAc,
        user: userAc,
      },
    }),
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
    // The environment name-prefix isolates cookie names across envs; it applies independent of the cookie-mode switch below (a private-suffix env would still want it).
    ...(cookiePrefix && { cookiePrefix }),
    // Cross-subdomain (custom domains, portless localhost) shares one Domain cookie. A public hosting suffix (isPrivate) and a bare host both stay host-only with SameSite=Lax: on a public suffix the client routes same-origin through the web proxy so the cookie is first-party to the web, and a bare host has no shareable parent to widen to.
    ...(!isPrivate && cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
          },
        }
      : {}),
  },
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
