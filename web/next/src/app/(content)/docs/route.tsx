import { createFileRoute, Outlet } from "@tanstack/react-router"
import { useFumadocsLoader } from "fumadocs-core/source/client"
import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/tanstack"

import { SidebarDocsContent, SidebarDocsFooter, SidebarDocsSearch } from "@/components/sidebar/docs"
import { SidebarFloatingTrigger } from "@/components/sidebar/floating-trigger"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { getDocsTree } from "@/lib/content-server"
import { resolveDocsNav } from "@/lib/docs/nav"
import { baseOptions } from "@/lib/fumadocs"

export const Route = createFileRoute("/(content)/docs")({
  loader: async () => ({ tree: await getDocsTree() }),
  component: Layout,
})

function Layout() {
  const { tree } = useFumadocsLoader(Route.useLoaderData())

  return (
    <SidebarProvider>
      <Sidebar className="md:pt-12" collapsible="offcanvas">
        <SidebarHeader className="mt-2.5">
          <SidebarDocsSearch />
        </SidebarHeader>
        <SidebarContent>
          <SidebarDocsContent groups={resolveDocsNav("docs")} />
        </SidebarContent>
        <SidebarFooter className="border-t">
          <SidebarDocsFooter />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <main>
        <SidebarFloatingTrigger />
        <RootProvider
          theme={{
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
    </SidebarProvider>
  )
}
