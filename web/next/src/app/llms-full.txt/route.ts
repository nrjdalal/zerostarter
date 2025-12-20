import { config } from "@/lib/config"
import { blogSource, docsSource } from "@/lib/source"

export const revalidate = false

export async function GET() {
  const docsPages = docsSource.getPages()
  const blogPages = blogSource.getPages().filter((p) => p.url !== "/blog")

  const scanned = await Promise.all(
    [...docsPages, ...blogPages].map(async (page) => {
      let content: string
      try {
        content = await page.data.getText("processed")
      } catch {
        content = await page.data.getText("raw")
      }

      const fullUrl = `${config.app.url}${page.url}`

      return `# [${page.data.title}](${fullUrl})
${content}`
    }),
  )

  return new Response(
    `# ${config.app.name}

> ${config.app.description}

${scanned.join("\n---\n\n")}`,
    {
      headers: {
        "Content-Type": "text/markdown",
      },
    },
  )
}
