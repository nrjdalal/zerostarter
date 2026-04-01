import { notFound } from "next/navigation"

import blogMeta from "@/../content/blog/meta.json"
import docsMeta from "@/../content/docs/meta.json"
import { config } from "@/lib/config"
import { getLLMText, llmTextHeaders } from "@/lib/llms"
import { sortByMeta } from "@/lib/sort-by-meta"
import { blogSource, docsSource } from "@/lib/source"

export const revalidate = false

async function createPageResponse(
  page: ReturnType<typeof blogSource.getPage> | ReturnType<typeof docsSource.getPage>,
  isDocs: boolean,
) {
  if (!page) notFound()

  const content = await getLLMText(page)

  const footer = isDocs
    ? `---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: ${config.app.url}/llms.txt`
    : undefined

  return new Response(footer ? `${content}\n\n${footer}` : content, {
    headers: {
      ...llmTextHeaders,
    },
  })
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params

  if (!slug || slug.length === 0) {
    const docsPages = sortByMeta(docsSource.getPages(), docsMeta.pages, "/docs")
    const docsIndex = docsPages
      .map((p) => `- [${p.data.title}](${config.app.url}${p.url}.md): ${p.data.description}`)
      .join("\n")

    return new Response(
      `# ${config.app.name}

> ${config.app.description}

## Documentation

> Complete documentation for ${config.app.name}

${docsIndex}

## Optional

- [Blog](${config.app.url}/blog.md): Latest articles and updates about ${config.app.name}
`,
      {
        headers: {
          ...llmTextHeaders,
        },
      },
    )
  }

  const isBlog = slug[0] === "blog"
  const isDocs = slug[0] === "docs"

  if (!isBlog && !isDocs) {
    notFound()
  }

  const source = isBlog ? blogSource : docsSource

  if (isBlog && slug.length === 1) {
    const blogPages = sortByMeta(
      blogSource.getPages().filter((p) => p.url !== "/blog"),
      blogMeta.pages,
      "/blog",
    )
    const blogIndex = blogPages
      .map((p) => `- [${p.data.title}](${config.app.url}${p.url}.md): ${p.data.description}`)
      .join("\n")

    return new Response(
      `# ${config.app.name}

> ${config.app.description}

## Blog

> Latest articles and updates about ${config.app.name}

${blogIndex}

## Optional

- [Documentation](${config.app.url}/llms.txt): Complete documentation for ${config.app.name}
`,
      {
        headers: {
          ...llmTextHeaders,
        },
      },
    )
  }

  if (isDocs && slug.length === 1) {
    return createPageResponse(source.getPage([]), true)
  }

  const pageSlug = slug.slice(1)
  return createPageResponse(source.getPage(pageSlug), isDocs)
}

export function generateStaticParams() {
  const indexParams = [{ slug: [] }]
  const docsParams = docsSource.generateParams().map((params) => ({
    slug: ["docs", ...(params.slug ?? [])],
  }))
  const blogParams = blogSource.generateParams().map((params) => ({
    slug: ["blog", ...(params.slug ?? [])],
  }))
  return [...indexParams, ...docsParams, ...blogParams]
}
