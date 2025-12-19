import { notFound } from "next/navigation"

import { config } from "@/lib/config"
import { source } from "@/lib/source"

export const revalidate = false

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params

  if (!slug) {
    const allPages = source.getPages()
    const index = allPages
      .map((p) => `- [${p.data.title}](${config.app.url}${p.url}.md): ${p.data.description}`)
      .join("\n")

    return new Response(
      `# Documentation

${index}`,
      {
        headers: {
          "Content-Type": "text/markdown",
        },
      },
    )
  }

  const pageSlug = slug[0] === "docs" ? (slug.length === 1 ? undefined : slug.slice(1)) : slug

  const page = source.getPage(pageSlug)
  if (!page) notFound()

  let content: string
  try {
    content = await page.data.getText("processed")
  } catch {
    content = await page.data.getText("raw")
  }

  const fullUrl = `${config.app.url}${page.url}`

  return new Response(
    `# [${page.data.title}](${fullUrl})
${content}
---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: ${config.app.url}/llms.txt`,
    {
      headers: {
        "Content-Type": "text/markdown",
      },
    },
  )
}

export function generateStaticParams() {
  return source.generateParams()
}
