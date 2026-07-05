import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { blogClientLoader } from "@/lib/content-client"
import { getBlogPage } from "@/lib/content-server"
import { pageHeadMeta } from "@/lib/fumadocs"

export const Route = createFileRoute("/(content)/blog/$")({
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/") ?? []
    const info = await getBlogPage({ data: slugs })
    await blogClientLoader.preload(info.path)
    return info
  },
  head: ({ loaderData }) => ({
    // A blog article is og:type article (with published/modified/author/tag meta); the index is a plain website page.
    meta: loaderData
      ? pageHeadMeta(loaderData, {
          ogPath: "/og/blog",
          ogType: loaderData.blog ? "article" : "website",
        })
      : [],
  }),
  component: Page,
})

function Page() {
  const info = Route.useLoaderData()
  return <Suspense>{blogClientLoader.useContent(info.path, info)}</Suspense>
}
