import { site } from "@packages/config/site"

import { contentSource } from "@/lib/content"
import { renderOgImage } from "@/lib/og-image"

export const dynamic = "force-static"

const docs = contentSource("docs")

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  const page = docs.getPageOr404(slug)

  return renderOgImage({
    sectionName: "Documentation",
    title: page.data.title || `${site.name} - Documentation`,
    description: page.data.description || `Documentation for ${site.name}`,
  })
}

export function generateStaticParams() {
  return docs.params()
}
