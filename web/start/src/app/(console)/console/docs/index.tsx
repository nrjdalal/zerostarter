import { createFileRoute } from "@tanstack/react-router"
import { Suspense } from "react"

import { getConsolePage } from "@/lib/auth/server-fns"
import { consoleClientLoader } from "@/lib/content-client"

export const Route = createFileRoute("/(console)/console/docs/")({
  loader: async () => {
    const info = await getConsolePage({ data: [] })
    await consoleClientLoader.preload(info.path)
    return info
  },
  component: Page,
})

function Page() {
  const info = Route.useLoaderData()
  return <Suspense>{consoleClientLoader.useContent(info.path, info)}</Suspense>
}
