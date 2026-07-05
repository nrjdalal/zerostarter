import { site } from "@packages/config/site"
import { createFileRoute } from "@tanstack/react-router"

import { getPublicBlogPage, getPublishedBlogPosts } from "@/lib/blog"
import { config } from "@/lib/config"
import { getLLMText, llmTextHeaders } from "@/lib/llms"
import { blogSource, docsSource } from "@/lib/source"

async function createPageResponse(
  page: ReturnType<typeof blogSource.getPage> | ReturnType<typeof docsSource.getPage>,
  isDocs: boolean,
) {
  if (!page) return new Response("Not Found", { status: 404 })

  const content = await getLLMText(page)

  const footer = isDocs
    ? `---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: ${config.app.url}/llms.txt`
    : undefined

  return new Response(footer ? `${content}\n\n${footer}` : content, {
    headers: llmTextHeaders,
  })
}

export const Route = createFileRoute("/(llms.txt)/llms.txt/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = params._splat?.split("/").filter(Boolean) ?? []

        const isBlog = slug[0] === "blog"
        const isDocs = slug[0] === "docs"

        if (!isBlog && !isDocs) {
          return new Response("Not Found", { status: 404 })
        }

        if (isBlog && slug.length === 1) {
          const blogPages = getPublishedBlogPosts()
          const blogIndex = blogPages
            .map((p) => `- [${p.data.title}](${config.app.url}${p.url}.md): ${p.data.description}`)
            .join("\n")

          return new Response(
            `# ${site.name}

> ${site.description}

## Blog

> Latest articles and updates about ${site.name}

${blogIndex}

## Optional

- [Documentation](${config.app.url}/llms.txt): Complete documentation for ${site.name}
`,
            {
              headers: llmTextHeaders,
            },
          )
        }

        if (isDocs && slug.length === 1) {
          return createPageResponse(docsSource.getPage([]), true)
        }

        const pageSlug = slug.slice(1)
        if (isBlog) {
          // getPublicBlogPage throws the router notFound; map a missing/unpublished post to a plain 404 response in this raw handler.
          try {
            return await createPageResponse(getPublicBlogPage(pageSlug), false)
          } catch {
            return new Response("Not Found", { status: 404 })
          }
        }

        return createPageResponse(docsSource.getPage(pageSlug), true)
      },
    },
  },
})
