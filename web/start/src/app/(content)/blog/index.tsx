import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { blogClientLoader } from "@/lib/content-client"
import { getBlogPage } from "@/lib/content-server"
import { pageHeadMeta } from "@/lib/fumadocs"

export const Route = createFileRoute("/(content)/blog/")({
  loader: async () => {
    const info = await getBlogPage({ data: [] })
    await blogClientLoader.preload(info.path)
    return info
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? pageHeadMeta(loaderData, { ogPath: "/og/blog", ogType: "website" }) : [],
  }),
  component: Page,
})

function Page() {
  const info = Route.useLoaderData()
  return <Suspense>{blogClientLoader.useContent(info.path, info)}</Suspense>
}
