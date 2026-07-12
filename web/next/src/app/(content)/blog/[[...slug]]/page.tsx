import type { Metadata } from "next"

import { contentSource } from "@/lib/content"
import { generatePageMetadata, renderPageContent } from "@/lib/fumadocs"

const blog = contentSource("blog")

// Scheduling depends on Next's default dynamicParams (true): a scheduled post not prebuilt by generateStaticParams renders on demand once published, and revalidate=60 refreshes cached surfaces within ~60s. Setting dynamicParams=false would 404 scheduled posts until a redeploy.
export const dynamic = "force-static"
export const revalidate = 60

export function generateStaticParams() {
  return blog.params()
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params
  return renderPageContent(blog, blog.getPageOr404(slug))
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}): Promise<Metadata> {
  const { slug } = await props.params
  return generatePageMetadata(blog, blog.getPageOr404(slug))
}
