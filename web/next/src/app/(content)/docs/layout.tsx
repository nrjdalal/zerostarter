import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { SidebarDocsContent } from "@/components/sidebar/docs/content"
import { SidebarDocsFooter } from "@/components/sidebar/docs/footer"
import { SidebarDocsSearch } from "@/components/sidebar/docs/search"
import { DocsSearchProvider } from "@/components/sidebar/docs/search-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/zeroui/sidebar-trigger"
import { baseOptions } from "@/lib/fumadocs"
import { docsSource } from "@/lib/source"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RootProvider
      theme={{
        enabled: false,
      }}
      search={{
        enabled: false,
      }}
    >
      <DocsSearchProvider>
        <SidebarProvider>
          <Sidebar className="md:pt-12" collapsible="offcanvas">
            <SidebarHeader className="mt-2.5">
              <SidebarDocsSearch />
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
            <DocsLayout
              {...baseOptions()}
              nav={{ enabled: false }}
              sidebar={{ enabled: false }}
              tree={docsSource.getPageTree()}
            >
              {children}
            </DocsLayout>
          </main>
        </SidebarProvider>
      </DocsSearchProvider>
    </RootProvider>
  )
}
