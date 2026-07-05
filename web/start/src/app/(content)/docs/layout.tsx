import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

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
import { resolveDocsNav } from "@/lib/docs/nav"
import { baseOptions } from "@/lib/fumadocs"
import { docsSource } from "@/lib/source"

export default function Layout({ children }: { children: React.ReactNode }) {
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
            tree={docsSource.getPageTree()}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </main>
    </SidebarProvider>
  )
}
