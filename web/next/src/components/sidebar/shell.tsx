import { site } from "@packages/config/site"
import { Link } from "@tanstack/react-router"

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

// Shared collapsible sidebar shell used by the dashboard and console layouts. Owns the sidebar chrome (provider, header brand, footer, rail); callers supply the badge, nav, footer, and the persisted open state (read from the sidebar_state cookie in their route loaders, where the Next.js app read it via next/headers).
export function SidebarShell({
  badge,
  defaultOpen = true,
  homeHref = "/",
  header,
  nav,
  footer,
  children,
}: {
  badge?: string
  defaultOpen?: boolean
  homeHref?: "/" | "/console"
  header?: React.ReactNode
  nav?: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AdaptiveShellSidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:mx-auto">
            <Link
              to={homeHref}
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
      <main className="flex min-h-svh min-w-0 flex-1 flex-col">
        <SidebarFloatingTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}
