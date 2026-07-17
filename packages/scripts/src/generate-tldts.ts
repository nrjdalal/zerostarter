import { resolve } from "node:path"

import { env } from "@packages/env/auth"
import { parse } from "tldts"

// Write the app host's tldts breakdown to the repo-root .generated/ dir at build time so its Public Suffix List never ships; @packages/auth's tsdown bakes this JSON via define. Only the fields cookieConfig reads (the ParsedHost shape) are kept.
const { domain, hostname, isIp, isPrivate, publicSuffix, subdomain } = parse(env.HONO_APP_URL, {
  allowPrivateDomains: true,
})
// Fail loud on tldts drift: a multi-label registrable host resolves to a full breakdown, so a null/undefined field (a renamed/moved field that would otherwise bake host-only cookies silently) is a build error. IPs, localhost, and single-label hosts legitimately carry null fields and are exempt.
const nullish = (value: unknown) => value === null || value === undefined
if (
  !isIp &&
  publicSuffix !== "localhost" &&
  typeof hostname === "string" &&
  hostname.includes(".") &&
  [domain, publicSuffix, subdomain, isPrivate].some(nullish)
) {
  throw new Error(
    `generate-tldts: "${env.HONO_APP_URL}" did not fully resolve (tldts drift, or an unparseable host?)`,
  )
}
await Bun.write(
  resolve(import.meta.dir, "../../../.generated/tldts.json"),
  JSON.stringify({ domain, isIp, isPrivate, publicSuffix, subdomain }),
)
