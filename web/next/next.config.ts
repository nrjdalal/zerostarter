import type { NextConfig } from "next"

import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/web-next"

getSafeEnv(env)

const nextConfig: NextConfig = {
  reactCompiler: true,
  // rewrites: async () => {
  //   return [
  //     {
  //       source: "/api/:path*",
  //       destination: `${env.NEXT_PUBLIC_API_URL}/api/:path*`,
  //     },
  //   ]
  // },
}

export default nextConfig
