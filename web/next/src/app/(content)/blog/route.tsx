import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useFumadocsLoader } from "fumadocs-core/source/client"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/tanstack"

import { getBlogTree } from "@/lib/content-server"
import { baseOptions } from "@/lib/fumadocs"

export const Route = createFileRoute("/(content)/blog")({
  loader: async () => ({ tree: await getBlogTree() }),
  component: Layout,
})

function Layout() {
  const { tree } = useFumadocsLoader(Route.useLoaderData())

  return (
    <main>
      <RootProvider
        theme={{
          enabled: false,
        }}
        search={{
          enabled: false,
        }}
      >
        <DocsLayout
          {...baseOptions()}
          nav={{ enabled: false }}
          sidebar={{ enabled: false }}
          tree={tree}
        >
          <Outlet />
        </DocsLayout>
      </RootProvider>
    </main>
  )
}
