import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { getConsolePage } from "@/lib/auth/server-fns"
import { consoleClientLoader } from "@/lib/content-client"

export const Route = createFileRoute("/(console)/console/docs/$")({
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/") ?? []
    const info = await getConsolePage({ data: slugs })
    await consoleClientLoader.preload(info.path)
    return info
  },
  component: Page,
})

function Page() {
  const info = Route.useLoaderData()
  return <Suspense>{consoleClientLoader.useContent(info.path, info)}</Suspense>
}
