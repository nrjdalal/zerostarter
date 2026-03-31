import { config } from "@/lib/config"

type LLMPage = {
  url: string
  data: {
    title?: string
    getText: (type: "processed" | "raw") => Promise<string>
  }
}

export const llmTextHeaders = {
  "Content-Type": "text/markdown; charset=utf-8",
} as const

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n*/

function parseFrontmatter(content: string) {
  const match = content.match(FRONTMATTER_PATTERN)

  if (!match) {
    return {
      body: content.trim(),
      title: undefined,
    }
  }

  const title = match[1]
    .split(/\r?\n/)
    .find((line) => line.startsWith("title:"))
    ?.replace(/^title:\s*/, "")
    .replace(/^['"]|['"]$/g, "")

  return {
    body: content.slice(match[0].length).trim(),
    title,
  }
}

export async function getLLMText(page: LLMPage) {
  let content: string

  try {
    content = await page.data.getText("processed")
  } catch {
    content = await page.data.getText("raw")
  }

  const { body, title } = parseFrontmatter(content)
  const pageTitle = page.data.title ?? title ?? page.url

  return `# [${pageTitle}](${config.app.url}${page.url})

${body}`
}
