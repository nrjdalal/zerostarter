import { createRequire } from "node:module"
import path from "node:path"

import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/web-next"
import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"

getSafeEnv(env, "@web/next")

// Node always loads the native @takumi-rs/core binding, so the wasm fallback
// is dead weight in the standalone output. Resolve its real location (package
// managers hoist it to the workspace root) and exclude it from file tracing.
const takumiWasmExcludes = (() => {
  try {
    const resolve = createRequire(path.join(process.cwd(), "package.json")).resolve
    const takumiEntry = resolve("takumi-js")
    const takumiDir = `${takumiEntry.slice(0, takumiEntry.lastIndexOf(`${path.sep}takumi-js${path.sep}`))}${path.sep}takumi-js`
    const wasmEntry = resolve("@takumi-rs/wasm", { paths: [takumiDir] })
    const marker = path.join("@takumi-rs", "wasm")
    const wasmDir = wasmEntry.slice(0, wasmEntry.lastIndexOf(marker) + marker.length)
    return [path.join(path.relative(process.cwd(), wasmDir), "**")]
  } catch {
    return []
  }
})()

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  rewrites: async () => {
    return [
      {
        source: "/api/:path((?!og$|og/).*)",
        destination: `${env.INTERNAL_API_URL || env.NEXT_PUBLIC_API_URL}/api/:path`,
      },
      {
        source: "/api/search",
        destination: `${env.NEXT_PUBLIC_APP_URL}/api/search`,
      },
      {
        source: "/blog/:path*.md",
        destination: "/llms.txt/blog/:path*",
      },
      {
        source: "/blog/:path*.txt",
        destination: "/llms.txt/blog/:path*",
      },
      {
        source: "/docs/:path*.md",
        destination: "/llms.txt/docs/:path*",
      },
      {
        source: "/docs/:path*.txt",
        destination: "/llms.txt/docs/:path*",
      },
    ]
  },
  serverExternalPackages: ["takumi-js"],
  outputFileTracingExcludes: {
    "*": takumiWasmExcludes,
  },
}

const withMDX = createMDX()
export default withMDX(nextConfig)
