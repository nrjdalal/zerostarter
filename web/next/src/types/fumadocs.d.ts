import "fumadocs-core/source"
import type { StructuredData } from "fumadocs-core/mdx-plugins/remark-structure"
import type { TOCItemType } from "fumadocs-core/toc"
import type { MDXContent } from "mdx/types"

declare module "fumadocs-core/source" {
  interface PageData {
    /** Compiled MDX content (as component) */
    body: MDXContent
    /** Table of contents generated from content */
    toc: TOCItemType[]
    /** Structured data for document search indexing */
    structuredData: StructuredData
    /** Raw exports from the compiled MDX file */
    _exports: Record<string, unknown>
    /** File info */
    info: {
      path: string
      fullPath: string
    }
    /** Get document as text */
    getText: (type: "raw" | "processed") => Promise<string>
    /** Get MDAST */
    getMDAST: () => Promise<import("mdast").Root>
    /** Full page layout flag */
    full?: boolean
  }
}
