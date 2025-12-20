import { notFound } from "next/navigation"

import { config } from "@/lib/config"
import { blogSource, docsSource } from "@/lib/source"

export const revalidate = false

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params

  if (!slug) {
    const docsPages = docsSource.getPages()
    const docsIndex = docsPages
      .map((p) => `- [${p.data.title}](${config.app.url}${p.url}.md): ${p.data.description}`)
      .join("\n")

    return new Response(
      `# Documentation

${docsIndex}`,
      {
        headers: {
          "Content-Type": "text/markdown",
        },
      },
    )
  }

  const isBlog = slug[0] === "blog"
  const isDocs = slug[0] === "docs"
  const source = isBlog ? blogSource : docsSource
  const pageSlug = isBlog || isDocs ? (slug.length === 1 ? undefined : slug.slice(1)) : slug

  const page = source.getPage(pageSlug)
  if (!page) notFound()

  let content: string
  try {
    content = await page.data.getText("processed")
  } catch {
    content = await page.data.getText("raw")
  }

  const fullUrl = `${config.app.url}${page.url}`

  const footer = isDocs
    ? `---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: ${config.app.url}/llms.txt
`
    : ""

  return new Response(
    `# [${page.data.title}](${fullUrl})
${content}
${footer}`,
    {
      headers: {
        "Content-Type": "text/markdown",
      },
    },
  )
}

export function generateStaticParams() {
  const docsParams = docsSource.generateParams().map((params) => ({
    slug: ["docs", ...(params.slug ?? [])],
  }))
  const blogParams = blogSource.generateParams().map((params) => ({
    slug: ["blog", ...(params.slug ?? [])],
  }))
  return [...docsParams, ...blogParams]
}
