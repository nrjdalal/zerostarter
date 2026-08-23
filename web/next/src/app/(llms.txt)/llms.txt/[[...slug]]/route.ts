import { site } from "@packages/config/site"

import docsMeta from "@/../content/docs/meta.json"
import { config } from "@/lib/config"
import { contentSource } from "@/lib/content"
import { getLLMText, llmTextHeaders, markdownNotFound, sortByMeta } from "@/lib/llms"

export const dynamic = "force-static"
export const revalidate = 60

const docs = contentSource("docs")
const blog = contentSource("blog")

async function createPageResponse(page: Parameters<typeof getLLMText>[0], isDocs: boolean) {
  const content = await getLLMText(page)

  const footer = isDocs
    ? `---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: ${config.app.url}/llms.txt`
    : undefined

  return new Response(footer ? `${content}\n\n${footer}` : content, {
    headers: llmTextHeaders,
  })
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params

  if (!slug || slug.length === 0) {
    const docsSection = docs.enabled
      ? `

## Documentation

> Complete documentation for ${site.name}

${sortByMeta(docs.pages(), docsMeta.pages, "/docs")
  .map((p) => `- [${p.data.title}](${config.app.url}${p.url}.md): ${p.data.description}`)
  .join("\n")}`
      : ""
    const blogSection = blog.enabled
      ? `

## Optional

- [Blog](${config.app.url}/blog.md): Latest articles and updates about ${site.name}`
      : ""

    return new Response(
      `# ${site.name}

> ${site.description}

## When to use

- ${site.tagline}. Reach for ${site.name} to start a product on that foundation rather than assembling it.
- Read ${config.app.url}/llms-full.txt for every page in one request, or append .md to any docs or blog URL for one page. Those URLs, and this site's pages, also answer \`Accept: text/markdown\`.
- Call the API through its reference at ${config.app.url}/api/docs; the OpenAPI document at ${config.app.url}/api/openapi.json declares each operation's security requirement and role.${docsSection}${blogSection}
`,
      {
        headers: llmTextHeaders,
      },
    )
  }

  const kind = slug[0] === "blog" ? "blog" : slug[0] === "docs" ? "docs" : null
  if (!kind) return markdownNotFound(config.app.url)

  const source = kind === "blog" ? blog : docs
  if (!source.enabled) return markdownNotFound(config.app.url)

  if (kind === "blog" && slug.length === 1) {
    const blogIndex = blog
      .pages()
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

  const pageSlug = slug.length === 1 ? [] : slug.slice(1)
  const page = source.getPage(pageSlug)
  if (!page) return markdownNotFound(config.app.url)
  return createPageResponse(page, kind === "docs")
}

export function generateStaticParams() {
  const indexParams = [{ slug: [] }]
  const docsParams = docs.params().map((p) => ({ slug: ["docs", ...p.slug] }))
  const blogParams = blog.params().map((p) => ({ slug: ["blog", ...p.slug] }))
  return [...indexParams, ...docsParams, ...blogParams]
}
