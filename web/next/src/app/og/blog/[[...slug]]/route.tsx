import { site } from "@packages/config/site"

import { generatePublicBlogParams, getPublicBlogPage } from "@/lib/blog"
import { generateOgImage } from "@/lib/og-image"
import { blogSource } from "@/lib/source"

export const dynamic = "force-static"
export const revalidate = 60

export function generateStaticParams() {
  return generatePublicBlogParams().map((params) => ({
    slug: params.slug ?? [],
  }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  void getPublicBlogPage(slug)

  return generateOgImage(slug, {
    source: blogSource,
    sectionName: "Blog",
    defaultTitle: `${site.name} - Blog`,
    defaultDescription: `Blog post from ${site.name}`,
  })
}
