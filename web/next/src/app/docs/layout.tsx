import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { baseOptions } from "@/lib/fumadocs"
import { docsSource } from "@/lib/source"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { SidebarDocs } from "@/components/sidebar/docs"

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <SidebarProvider>
      <Sidebar className="md:pt-12" collapsible="offcanvas">
        <SidebarHeader />
        <SidebarContent>
          <SidebarDocs />
        </SidebarContent>
        <SidebarFooter />
        <SidebarRail />
      </Sidebar>
      <main>
        <SidebarTrigger className="bg-sidebar fixed right-0 bottom-0 mr-12 mb-12 size-8 cursor-pointer border md:right-auto md:mb-48 md:rounded-l-none md:border-l-0" />
        <RootProvider>
          <DocsLayout
            nav={{
              enabled: false,
            }}
            sidebar={{
              enabled: false,
            }}
            tree={docsSource.pageTree}
            {...baseOptions()}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </main>
    </SidebarProvider>
  )
}
