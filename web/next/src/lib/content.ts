import { features } from "@packages/config/site"
import type { Root } from "fumadocs-core/page-tree"
import { createRelativeLink } from "fumadocs-ui/mdx"
import { notFound } from "next/navigation"

import {
  generatePublicBlogParams,
  getPublicBlogPageTree,
  getPublishedBlogPosts,
  isPublicBlogPage,
} from "@/lib/blog"
import { blogSource, consoleSource, docsSource } from "@/lib/source"

export type ContentKind = "blog" | "console" | "docs"

// The one place that knows each content kind's source, base URL, the feature flag that gates it, and whether it has an /og route. baseUrl is `/console/docs` for the admin-gated internal docs (feature `internalDocs`), which has no OG route.
const REGISTRY = {
  blog: { source: blogSource, baseUrl: "/blog", feature: "blog", og: true },
  console: { source: consoleSource, baseUrl: "/console/docs", feature: "internalDocs", og: false },
  docs: { source: docsSource, baseUrl: "/docs", feature: "docs", og: true },
} as const

type Registry = typeof REGISTRY
type SourceOf<K extends ContentKind> = Registry[K]["source"]
export type PageOf<K extends ContentKind> = NonNullable<ReturnType<SourceOf<K>["getPage"]>>

const EMPTY_TREE: Root = { name: "", children: [] }

export interface ContentSource<K extends ContentKind> {
  kind: K
  baseUrl: string
  enabled: boolean
  // Whether this kind has an /og${baseUrl} route; false for console, so metadata omits the OG image rather than pointing at a route that does not exist.
  og: boolean
  source: SourceOf<K>
  getPageOr404: (slug: string[] | undefined) => PageOf<K>
  pages: () => PageOf<K>[]
  params: () => { slug: string[] }[]
  tree: () => Root
  relativeLink: (page: PageOf<K>) => ReturnType<typeof createRelativeLink>
}

// A handle to one content kind. When the kind's feature is off, every accessor behaves as if the collection were empty: getPageOr404 404s, pages/params return [], and tree is empty, so routes, static params, sitemap, llms, and search all drop the surface with no per-caller checks. The blog handle also applies the publish gate (index plus published posts).
export function contentSource<K extends ContentKind>(kind: K): ContentSource<K> {
  const entry = REGISTRY[kind]
  const source = entry.source
  const enabled = features[entry.feature]
  const isBlog = kind === "blog"

  const getPageOr404 = (slug: string[] | undefined): PageOf<K> => {
    if (!enabled) notFound()
    const page = source.getPage(slug)
    if (!page || (isBlog && !isPublicBlogPage(page as PageOf<"blog">))) notFound()
    return page as PageOf<K>
  }

  const pages = (): PageOf<K>[] => {
    if (!enabled) return []
    if (isBlog) return getPublishedBlogPosts() as unknown as PageOf<K>[]
    return source.getPages() as PageOf<K>[]
  }

  const params = (): { slug: string[] }[] => {
    if (!enabled) return []
    const raw = isBlog ? generatePublicBlogParams() : source.generateParams()
    return raw.map((p) => ({ slug: p.slug ?? [] }))
  }

  const tree = (): Root => {
    if (!enabled) return EMPTY_TREE
    if (isBlog) return getPublicBlogPageTree()
    return source.getPageTree()
  }

  // Resolve relative markdown links against this kind's own source: each has its own baseUrl and file tree, so a blog or console page must not resolve against docs. kind pins the source, so the per-branch cast is safe.
  const relativeLink = (page: PageOf<K>): ReturnType<typeof createRelativeLink> => {
    if (kind === "blog") return createRelativeLink(blogSource, page as PageOf<"blog">)
    if (kind === "console") return createRelativeLink(consoleSource, page as PageOf<"console">)
    return createRelativeLink(docsSource, page as PageOf<"docs">)
  }

  return {
    kind,
    baseUrl: entry.baseUrl,
    enabled,
    og: entry.og,
    source,
    getPageOr404,
    pages,
    params,
    tree,
    relativeLink,
  }
}
