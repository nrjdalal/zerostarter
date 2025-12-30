import type { NextConfig } from "next"

import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/web-next"
import { createMDX } from "fumadocs-mdx/next"

getSafeEnv(env, "@web/next")

const nextConfig: NextConfig = {
  reactCompiler: true,
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: `${env.NEXT_PUBLIC_API_URL}/api/:path*`,
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
}

const withMDX = createMDX()
export default withMDX(nextConfig)
