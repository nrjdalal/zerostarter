import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { DashboardFooter, OrgSwitcher } from "@/components/dashboard/sidebar"
import { SidebarShell } from "@/components/shell/sidebar-shell"
import { auth } from "@/lib/auth"
import { config } from "@/lib/config"

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession()

  if (!session?.user) redirect("/")

  if (!session.session.activeOrganizationId) {
    const cookieStore = await cookies()
    const lastOrgId = cookieStore.get(`last-active-org_${session.user.id}`)?.value
    if (lastOrgId) {
      const url = `${config.api.internalUrl || config.api.url}/api/auth/organization/set-active`
      const reqHeaders = Object.fromEntries((await headers()).entries())
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { ...reqHeaders, "content-type": "application/json" },
          body: JSON.stringify({ organizationId: lastOrgId }),
        })
        if (!response.ok) {
          console.error(
            `failed to restore active organization: ${response.status} ${response.statusText}`,
          )
        }
      } catch (error) {
        console.error("failed to restore active organization", error)
      }
    }
  }

  return (
    <SidebarShell
      header={<OrgSwitcher />}
      footer={
        <DashboardFooter user={session.user} canAccessConsole={session.user.role === "admin"} />
      }
    >
      {children}
    </SidebarShell>
  )
}
