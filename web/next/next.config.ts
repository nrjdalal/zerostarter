import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/web-next"
import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"

getSafeEnv(env, "@web/next")

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: `${env.INTERNAL_API_URL || env.NEXT_PUBLIC_API_URL}/api/:path*`,
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
}

const withMDX = createMDX()
export default withMDX(nextConfig)
