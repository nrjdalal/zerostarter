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

const nextConfig: NextConfig = {
  output: "standalone",
  ...(libc && {
    outputFileTracingExcludes: { "*": libcExcludes[libc] },
    outputFileTracingIncludes: {
      "/og": [`node_modules/@takumi-rs/core-linux-*-${{ glibc: "gnu", musl: "musl" }[libc]}/**`],
    },
  }),
  reactCompiler: true,
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: `${env.INTERNAL_API_URL || env.NEXT_PUBLIC_API_URL}/api/:path`,
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
