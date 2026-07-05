import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { docsClientLoader } from "@/lib/content-client"
import { getDocsPage } from "@/lib/content-server"
import { pageHeadMeta } from "@/lib/fumadocs"

export const Route = createFileRoute("/(content)/docs/")({
  loader: async () => {
    const info = await getDocsPage({ data: [] })
    await docsClientLoader.preload(info.path)
    return info
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? pageHeadMeta(loaderData, { ogPath: "/og/docs", ogType: "website" }) : [],
  }),
  component: Page,
})

function Page() {
  const info = Route.useLoaderData()
  return <Suspense>{docsClientLoader.useContent(info.path, info)}</Suspense>
}
