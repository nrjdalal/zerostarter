import browserCollections from "collections/browser"

import { PageBody, type PageInfo } from "@/lib/fumadocs"

// Client loaders lazily import the compiled MDX modules; one per collection, shared by that collection's index and splat routes.

export const docsClientLoader = browserCollections.docs.createClientLoader({
  component({ toc, default: MDX }, info: PageInfo) {
    return <PageBody info={info} toc={toc} MDX={MDX} />
  },
})

export const blogClientLoader = browserCollections.blog.createClientLoader({
  component({ toc, default: MDX }, info: PageInfo) {
    return <PageBody info={info} toc={toc} MDX={MDX} />
  },
})
