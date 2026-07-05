import defaultMdxComponents from "fumadocs-ui/mdx"
import type { MDXComponents } from "mdx/types"

import { BlogPostList } from "@/components/blog/post-list"
import type { PostSummary } from "@/lib/fumadocs"

// The MDX render is client-side in Start, so the blog post list is bound to data from the route loader here rather than reading the server source inside the component.
export function getMDXComponents(
  options?: { posts?: PostSummary[] } & MDXComponents,
): MDXComponents {
  const { posts, ...components } = options ?? {}
  return {
    ...defaultMdxComponents,
    BlogPostList: () => <BlogPostList posts={posts ?? []} />,
    ...components,
  }
}
