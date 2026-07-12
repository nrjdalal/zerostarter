import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { DocsFooter, DocsNav, DocsSearch } from "@/components/docs/sidebar"
import { SidebarFloatingTrigger } from "@/components/shell/sidebar-floating-trigger"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { contentSource } from "@/lib/content"
import { resolveDocsNav } from "@/lib/docs"
import { baseOptions } from "@/lib/fumadocs"

const docs = contentSource("docs")

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar className="md:pt-12" collapsible="offcanvas">
        <SidebarHeader className="mt-2.5">
          <DocsSearch />
        </SidebarHeader>
        <SidebarContent>
          <DocsNav groups={resolveDocsNav("docs")} />
        </SidebarContent>
        <SidebarFooter className="border-t">
          <DocsFooter />
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
            tree={docs.tree()}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </main>
    </SidebarProvider>
  )
}
