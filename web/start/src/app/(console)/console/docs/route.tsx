import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useFumadocsLoader } from "fumadocs-core/source/client"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/tanstack"

import { getConsoleTree } from "@/lib/auth/server-fns"
import { baseOptions } from "@/lib/fumadocs"

export const Route = createFileRoute("/(console)/console/docs")({
  loader: async () => ({ tree: await getConsoleTree() }),
  component: Layout,
})

function Layout() {
  const { tree } = useFumadocsLoader(Route.useLoaderData())

  return (
    <main className="console-docs">
      <RootProvider
        theme={{
          enabled: false,
        }}
        search={{
          options: {
            api: "/api/console/search",
          },
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
