import { site } from "@packages/config/site"

import { renderOgImage } from "@/lib/og-image"

export const dynamic = "force-dynamic"

export function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  return renderOgImage({
    sectionName: searchParams.get("section")?.slice(0, 100) || undefined,
    title: searchParams.get("title")?.slice(0, 100) || site.tagline,
    description: searchParams.get("description")?.slice(0, 200) || site.description,
  })
}
