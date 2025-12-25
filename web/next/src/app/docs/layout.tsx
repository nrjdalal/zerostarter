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
} from "@/components/ui/sidebar"
import { SidebarDocsContent, SidebarDocsFooter } from "@/components/sidebar/docs"
import { SidebarSearch } from "@/components/sidebar/search"
import { SidebarTrigger } from "@/components/zeroui/sidebar-trigger"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar className="md:pt-12" collapsible="offcanvas">
        <SidebarHeader className="mt-2.5">
          <SidebarSearch />
        </SidebarHeader>
        <SidebarContent>
          <SidebarDocsContent />
        </SidebarContent>
        <SidebarFooter className="border-t">
          <SidebarDocsFooter />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <main>
        <SidebarTrigger className="md:bg-sidebar! hover:md:bg-sidebar-accent! fixed right-0 bottom-0 mr-6 mb-18 h-8 cursor-pointer border md:right-auto md:mb-48 md:rounded-l-none md:border-l-0">
          <span>Docs</span>
        </SidebarTrigger>
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
