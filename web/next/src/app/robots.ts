import { MetadataRoute } from "next"

import { config } from "@/lib/config"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = config.app.url

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/x/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
