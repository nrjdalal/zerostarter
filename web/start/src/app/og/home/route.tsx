import { site } from "@packages/config/site"

import { renderOgImage } from "@/lib/og-image"

export const dynamic = "force-static"

export function GET() {
  return renderOgImage({
    title: site.tagline,
    description: site.description,
  })
}
