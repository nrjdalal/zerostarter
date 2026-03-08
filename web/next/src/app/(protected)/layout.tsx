import { cookies, headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"

import {
  SidebarDashboardOrgSwitcher,
  SidebarDashboardUserActions,
} from "@/components/sidebar/dashboard"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/zeroui/sidebar-trigger"
import { auth } from "@/lib/auth"
import { config } from "@/lib/config"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const sidebarStateCookie = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarStateCookie ? sidebarStateCookie === "true" : true
  const session = await auth.api.getSession()

  if (!session?.user) redirect("/")

  if (!session.session.activeOrganizationId) {
    const lastOrgId = cookieStore.get(`last-active-org_${session.user.id}`)?.value
    if (lastOrgId) {
      const url = `${config.api.internalUrl || config.api.url}/api/auth/organization/set-active`
      const reqHeaders = Object.fromEntries((await headers()).entries())
      await fetch(url, {
        method: "POST",
        headers: { ...reqHeaders, "content-type": "application/json" },
        body: JSON.stringify({ organizationId: lastOrgId }),
      }).catch(() => {})
    }
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:mx-auto">
            <Link
              href="/"
              className="flex items-center gap-2 px-1.5 py-2 font-bold group-data-[collapsible=icon]:hidden"
            >
              {config.app.name}
              <Badge variant="secondary" className="text-xs">
                RC
              </Badge>
            </Link>{" "}
            <SidebarTrigger className="bg-sidebar cursor-pointer border" />
          </div>
          <SidebarDashboardOrgSwitcher />
        </SidebarHeader>
        <SidebarContent>{/* Content Goes Here */}</SidebarContent>
        <SidebarFooter>
          <SidebarDashboardUserActions user={session.user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <main>{children}</main>
    </SidebarProvider>
  )
}
