import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { FEATURE_DEFS } from "../../../packages/cli/bin/commands/init"
import { DEFAULT_FEATURES, siteTemplate } from "../../../packages/cli/src/templates"

// The canonical feature keys, read from the config source (not its build) so this guard needs no build step and runs in any test env. Guards the four places a flag lives against drift: the config's `features`, the CLI's DEFAULT_FEATURES + FEATURE_DEFS, and the generated site.ts block.
const configFeatureKeys = (() => {
  const src = readFileSync(join(import.meta.dir, "../../../packages/config/src/site.ts"), "utf8")
  const match = src.match(/export const features = \{([^}]*)\}/)
  const block = match ? match[1] : ""
  return [...block.matchAll(/(\w+):/g)].map((m) => m[1]).sort()
})()

test("config declares a non-empty features set", () => {
  expect(configFeatureKeys.length).toBeGreaterThan(0)
})

test("CLI DEFAULT_FEATURES and FEATURE_DEFS cover exactly the config feature keys", () => {
  expect(Object.keys(DEFAULT_FEATURES).sort()).toEqual(configFeatureKeys)
  expect(FEATURE_DEFS.map((f) => String(f.value)).sort()).toEqual(configFeatureKeys)
})

test("siteTemplate emits every config feature key", () => {
  const out = siteTemplate({ name: "acme" })
  for (const key of configFeatureKeys) expect(out).toContain(`${key}:`)
})
