import type { NextConfig } from "next"

const API_URL = process.env.API_URL || "http://localhost:4000"

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
