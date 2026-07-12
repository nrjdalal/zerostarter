import { site } from "@packages/config/site"

import { contentSource } from "@/lib/content"
import { renderOgImage } from "@/lib/og-image"

export const dynamic = "force-static"
export const revalidate = 60

const blog = contentSource("blog")

export function generateStaticParams() {
  return blog.params()
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  const page = blog.getPageOr404(slug)

  return renderOgImage({
    sectionName: "Blog",
    title: page.data.title || `${site.name} - Blog`,
    description: page.data.description || `Blog post from ${site.name}`,
  })
}
