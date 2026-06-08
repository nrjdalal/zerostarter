import { config } from "@/lib/config"
import { renderOgImage } from "@/lib/og-image"

export const dynamic = "force-dynamic"

export function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  return renderOgImage({
    sectionName: searchParams.get("section")?.slice(0, 100) || undefined,
    title: searchParams.get("title")?.slice(0, 100) || config.app.name,
    description: searchParams.get("description")?.slice(0, 200) || config.app.description,
  })
}
