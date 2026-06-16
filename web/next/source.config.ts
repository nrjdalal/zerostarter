import { pageSchema } from "fumadocs-core/source/schema"
import { defineConfig, defineDocs } from "fumadocs-mdx/config"
import { z } from "zod"

// docs.config.ts owns these fields; the docs generator syncs the full set into each MDX's
// frontmatter, so the schema must accept them (nav defaults to title, publish defaults to true).
const docsSchema = pageSchema.extend({
  slug: z.string().optional(),
  label: z.string().optional(),
  publish: z.boolean().optional(),
})

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: docsSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export const blog = defineDocs({
  dir: "content/blog",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

// Private documentation for the /console admin area. Kept in a separate collection so it is never mixed into the public docs source, and is excluded from public search, sitemap, and llms.txt by construction.
export const consoleDocs = defineDocs({
  dir: "content/console",
  docs: {
    schema: docsSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export default defineConfig()
