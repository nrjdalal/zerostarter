import { site } from "@packages/config/site"
import { cookies } from "next/headers"
import Link from "next/link"

import { SidebarFloatingTrigger } from "@/components/sidebar/floating-trigger"
import { AdaptiveShellSidebar } from "@/components/sidebar/shell-sidebar"
import { Badge } from "@/components/ui/badge"
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

// Shared collapsible sidebar shell used by the dashboard and console layouts. Owns the sidebar chrome (provider, header brand, footer, rail) and the persisted open state; callers supply the badge, nav, and footer.
export async function SidebarShell({
  badge,
  homeHref = "/",
  header,
  nav,
  footer,
  children,
}: {
  badge?: string
  homeHref?: string
  header?: React.ReactNode
  nav?: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const sidebarStateCookie = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarStateCookie ? sidebarStateCookie === "true" : true

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AdaptiveShellSidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:mx-auto">
            <Link
              href={homeHref}
              className="flex items-center gap-2 px-1.5 py-2 font-bold group-data-[collapsible=icon]:hidden"
            >
              {site.name}
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </Link>{" "}
            <SidebarTrigger variant="secondary" className="bg-sidebar border" />
          </div>
          {header}
        </SidebarHeader>
        <SidebarContent>{nav}</SidebarContent>
        <SidebarFooter>{footer}</SidebarFooter>
        <SidebarRail />
      </AdaptiveShellSidebar>
      <main>
        <SidebarFloatingTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}
