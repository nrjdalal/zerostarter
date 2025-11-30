import type { NextConfig } from "next"

import { env } from "@packages/env"

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: `${env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
