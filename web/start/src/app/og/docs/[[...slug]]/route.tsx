import { site } from "@packages/config/site"

import { generateOgImage } from "@/lib/og-image"
import { docsSource } from "@/lib/source"

export const dynamic = "force-static"

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params

  return generateOgImage(slug, {
    source: docsSource,
    sectionName: "Documentation",
    defaultTitle: `${site.name} - Documentation`,
    defaultDescription: `Documentation for ${site.name}`,
  })
}

export function generateStaticParams() {
  return docsSource.generateParams().map((params) => ({
    slug: params.slug ?? [],
  }))
}
