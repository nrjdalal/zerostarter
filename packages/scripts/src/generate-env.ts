import { resolve } from "node:path"

import { parse } from "tldts"

// One build step for both deploy consumers; tldts's Public Suffix List runs only here at build, never in a shipped bundle. Each target picks its URL source (a different env module, so only the env that build actually has is validated) and the `.generated/<target>-env.json` the consumer reads: auth bakes the full host breakdown for cookieConfig via tsdown define, web bakes just the client isPrivate signal that next.config inlines (next.config cannot read NEXT_PUBLIC_ vars itself).
const TARGETS = {
  auth: {
    url: () => import("@packages/env/auth").then((m) => m.env.HONO_APP_URL),
    file: "auth-env.json",
    out: (h: ReturnType<typeof parse>) => ({
      domain: h.domain,
      isIp: h.isIp,
      isPrivate: h.isPrivate,
      publicSuffix: h.publicSuffix,
      subdomain: h.subdomain,
    }),
  },
  web: {
    url: () => import("@packages/env/web-next").then((m) => m.env.NEXT_PUBLIC_API_URL),
    file: "web-env.json",
    out: (h: ReturnType<typeof parse>) => ({ isPrivate: h.isPrivate === true }),
  },
} as const

const { url, file, out } = TARGETS[process.argv[2] === "web" ? "web" : "auth"]

const rawUrl = await url()
const host = parse(rawUrl, { allowPrivateDomains: true })
const { domain, hostname, isIp, isPrivate, publicSuffix, subdomain } = host
// Fail loud on tldts drift: a multi-label registrable host resolves to a full breakdown, so a null/undefined field (a renamed/moved field that would otherwise bake host-only cookies or a false isPrivate silently) is a build error. IPs, localhost, and single-label hosts legitimately carry null fields and are exempt.
const nullish = (value: unknown) => value === null || value === undefined
if (
  !isIp &&
  publicSuffix !== "localhost" &&
  typeof hostname === "string" &&
  hostname.includes(".") &&
  [domain, publicSuffix, subdomain, isPrivate].some(nullish)
) {
  throw new Error(
    `generate-env: "${rawUrl}" did not fully resolve (tldts drift, or an unparseable host?)`,
  )
}

await Bun.write(resolve(import.meta.dir, `../../../.generated/${file}`), JSON.stringify(out(host)))
