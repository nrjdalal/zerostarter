import { getSafeEnv } from "@packages/env"
import { env } from "@packages/env/web-next"
import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"

getSafeEnv(env, "@web/next")

const MANAGE_TO_FEATURES = [
  "authentication",
  "dashboard",
  "database",
  "analytics",
  "blog",
  "feedback",
]
const MANAGE_TO_OPERATIONS = ["environment", "api-conventions", "code-quality", "release"]
const MANAGE_TO_CONTENT = ["documentation", "theming", "og-images", "llms-txt", "robots", "sitemap"]

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  redirects: async () => [
    ...MANAGE_TO_FEATURES.map((slug) => ({
      source: `/docs/manage/${slug}`,
      destination: `/docs/features/${slug}`,
      permanent: true,
    })),
    ...MANAGE_TO_OPERATIONS.map((slug) => ({
      source: `/docs/manage/${slug}`,
      destination: `/docs/operations/${slug}`,
      permanent: true,
    })),
    ...MANAGE_TO_CONTENT.map((slug) => ({
      source: `/docs/manage/${slug}`,
      destination: `/docs/content/${slug}`,
      permanent: true,
    })),
    {
      source: "/docs/getting-started/roadmap",
      destination: "/docs/about/roadmap",
      permanent: true,
    },
    {
      source: "/docs/contributing",
      destination: "/docs/about/contributing",
      permanent: true,
    },
  ],
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
