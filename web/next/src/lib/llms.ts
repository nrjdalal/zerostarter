import { config } from "@/lib/config"

type LLMPage = {
  url: string
  data: {
    title: string
    getText: (type: "processed" | "raw") => Promise<string>
  }
}

export const llmTextHeaders = {
  "Content-Type": "text/markdown; charset=utf-8",
} as const

export async function getLLMText(page: LLMPage) {
  let content: string

  try {
    content = await page.data.getText("processed")
  } catch {
    content = await page.data.getText("raw")
  }

  const normalizedContent = content.trim()

  return `# [${page.data.title}](${config.app.url}${page.url})

${normalizedContent}
`
}
