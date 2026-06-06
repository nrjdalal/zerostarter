import { config } from "@/lib/config"
import { generateOgImage } from "@/lib/og-image"
import { blogSource } from "@/lib/source"

export const dynamic = "force-static"

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params

  return generateOgImage(slug, {
    source: blogSource,
    sectionName: "Blog",
    defaultTitle: `${config.app.name} - Blog`,
    defaultDescription: `Blog post from ${config.app.name}`,
  })
}

export function generateStaticParams() {
  return blogSource.generateParams().map((params) => ({
    slug: params.slug ?? [],
  }))
}
