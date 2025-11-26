import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ]
  },
  // TODO: Make sure this makes any difference
  transpilePackages: ["@api/hono"],
}

export default nextConfig
