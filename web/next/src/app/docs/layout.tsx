import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { baseOptions } from "@/lib/fumadocs"
import { source } from "@/lib/source"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <SidebarProvider>
      <Sidebar className="md:pt-14" collapsible="offcanvas">
        <SidebarHeader />
        <SidebarContent>{/* Content Goes Here */}</SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <main>
        <SidebarTrigger className="bg-sidebar fixed right-0 mt-27 mr-2.5 size-8 cursor-pointer border md:top-1/2 md:right-auto md:mx-auto md:mt-auto md:-translate-y-1/2 md:rounded-l-none md:border-l-0" />
        <RootProvider>
          <DocsLayout
            nav={{
              enabled: false,
            }}
            sidebar={{
              enabled: false,
            }}
            tree={source.pageTree}
            {...baseOptions()}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </main>
    </SidebarProvider>
  )
}
