import { execSync } from "node:child_process"
import { defineConfig } from "tsdown"

import pkg from "../../package.json" with { type: "json" }

const getGitSha = () => {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim()
  } catch {
    return ""
  }
}

const VERSION = pkg.version as string
const GIT_SHA = getGitSha()
const BUILD_VERSION = GIT_SHA ? `${VERSION}-${GIT_SHA}` : VERSION

export default defineConfig({
  entry: ["src/index.ts", "src/api-hono.ts", "src/auth.ts", "src/db.ts", "src/web-next.ts"],
  outDir: "dist",
  minify: true,
  dts: { tsgo: true },
  define: {
    __VERSION__: JSON.stringify(VERSION),
    __GIT_SHA__: JSON.stringify(GIT_SHA),
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
})
