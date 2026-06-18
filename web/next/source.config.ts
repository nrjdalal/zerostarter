import { pageSchema } from "fumadocs-core/source/schema"
import { defineConfig, defineDocs } from "fumadocs-mdx/config"
import { z } from "zod"

import { normalizeBlogDate, normalizeBlogPublishAt } from "./src/lib/blog-policy"

// docs.config.ts owns these fields; the generator syncs them into each MDX, so the schema must accept them (label defaults to title).
const docsSchema = pageSchema.extend({
  slug: z.string().optional(),
  label: z.string().optional(),
})

const blogDateSchema = z.union([z.iso.date(), z.date()]).transform((value, ctx) => {
  const date = normalizeBlogDate(value)
  if (date) return date
  ctx.addIssue({ code: "custom", message: "Expected YYYY-MM-DD" })
  return z.NEVER
})

const blogPublishAtSchema = z
  .union([z.iso.date(), z.iso.datetime({ offset: true }), z.date()])
  .transform((value, ctx) => {
    const publishAt = normalizeBlogPublishAt(value)
    if (publishAt) return publishAt
    ctx.addIssue({
      code: "custom",
      message: "Expected YYYY-MM-DD or ISO datetime with timezone",
    })
    return z.NEVER
  })

// Blog posts own their own metadata in frontmatter; `date` drives display/order, `publishAt` schedules release, and `draft` hides a post regardless of date.
const blogSchema = pageSchema.extend({
  date: blogDateSchema,
  lastEdited: blogDateSchema.optional(),
  publishAt: blogPublishAtSchema.optional(),
  draft: z.boolean().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
    schema: blogSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

// Private documentation for the /console admin area. Kept in a separate collection so it is never mixed into the public docs source, and is excluded from public search, sitemap, and llms.txt by construction.
export const consoleDocs = defineDocs({
  dir: "content/console/docs",
  docs: {
    schema: docsSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
})

export default defineConfig()
