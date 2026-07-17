/// <reference types="bun" />
import { expect, test } from "bun:test"

// The build-only deploy detector (@packages/env/deploy) is the single module allowed to import tldts, and only build configs may import the detector. Both rules are enforced at the source seam, repo-wide: bundlers cannot pull PSL code into a shipped artifact unless some src/ file imports it, and build configs (tsdown.config.ts, next.config.ts) live outside src/, so "no src/ file imports it" is exactly the invariant. Import statements only, so prose mentions in comments do not trip it.
const FORBIDDEN = /(?:from\s*|import\s*\(\s*)["'](?:@packages\/env\/deploy|tldts)["']/

const repoRoot = new URL("../../../", import.meta.url).pathname
const srcRoots = [
  "api/hono/src",
  "packages/auth/src",
  "packages/config/src",
  "packages/db/src",
  "packages/env/src",
  "web/next/src",
]

test("no runtime source imports the build-only deploy detector or tldts", async () => {
  let scanned = 0
  for (const root of srcRoots) {
    const glob = new Bun.Glob("**/*.{ts,tsx}")
    for await (const rel of glob.scan({ cwd: repoRoot + root })) {
      if (root === "packages/env/src" && rel === "deploy.ts") continue
      const text = await Bun.file(`${repoRoot}${root}/${rel}`).text()
      expect(FORBIDDEN.test(text), `${root}/${rel} imports the build-only deploy module`).toBe(
        false,
      )
      scanned++
    }
  }
  // A wrong root silently scanning nothing would pass vacuously; pin that we actually swept the tree.
  expect(scanned).toBeGreaterThan(100)
})

test("tldts stays a devDependency, never a runtime dependency", async () => {
  const pkg = await Bun.file(new URL("../package.json", import.meta.url).pathname).json()
  expect(pkg.devDependencies.tldts).toBeDefined()
  expect(pkg.dependencies.tldts).toBeUndefined()
})
