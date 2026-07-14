import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/web-next"
import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"

getSafeEnv(env, "@web/next")

function detectLibc() {
  if (process.platform !== "linux") return undefined
  try {
    const report = process.report?.getReport() as { header?: { glibcVersionRuntime?: string } }
    return report?.header?.glibcVersionRuntime ? "glibc" : "musl"
  } catch {
    return "musl"
  }
}

const libc = detectLibc()
const libcExcludes = {
  glibc: [
    "../../node_modules/.bun/@img+sharp-libvips-linuxmusl-*@*/**",
    "../../node_modules/.bun/@img+sharp-linuxmusl-*@*/**",
    "../../node_modules/.bun/@takumi-rs+core-linux-*-musl@*/**",
    "../../node_modules/.bun/@takumi-rs+wasm@*/node_modules/@takumi-rs/wasm/**",
  ],
  musl: [
    "../../node_modules/.bun/@img+sharp-libvips-linux-*@*/**",
    "../../node_modules/.bun/@img+sharp-linux-*@*/**",
    "../../node_modules/.bun/@takumi-rs+core-linux-*-gnu@*/**",
    "../../node_modules/.bun/@takumi-rs+wasm@*/node_modules/@takumi-rs/wasm/**",
  ],
}

// Dev-only: Next 16 blocks cross-origin dev requests; behind portless the browser Host is a named .localhost subdomain, so allow the app's base domain and its subdomains. A single `*` (one label) is enough: the web dev server only ever sees its own host, portless-prefixed with the worktree branch as a single leftmost label.
const appDevHost = (() => {
  try {
    return new URL(env.NEXT_PUBLIC_APP_URL).hostname.split(".").slice(-2).join(".")
  } catch {
    return undefined
  }
})()

const nextConfig: NextConfig = {
  output: "standalone",
  ...(appDevHost && { allowedDevOrigins: [appDevHost, `*.${appDevHost}`] }),
  ...(libc && {
    outputFileTracingExcludes: { "*": libcExcludes[libc] },
    // Kept for Vercel: /og is traced into its own function and needs the takumi core binary here; removing it 500s /og at runtime (redundant only in Docker standalone).
    outputFileTracingIncludes: {
      "/og": [`node_modules/@takumi-rs/core-linux-*-${{ glibc: "gnu", musl: "musl" }[libc]}/**`],
    },
  }),
  reactCompiler: true,
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: `${env.INTERNAL_API_URL || env.NEXT_PUBLIC_API_URL}/api/:path*`,
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
  serverExternalPackages: ["@takumi-rs/core", "takumi-js"],
}

const withMDX = createMDX()
export default withMDX(nextConfig)
