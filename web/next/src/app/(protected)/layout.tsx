import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  SidebarDashboardOrgSwitcher,
  SidebarDashboardUserActions,
} from "@/components/sidebar/dashboard"
import { SidebarShell } from "@/components/sidebar/shell"
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
      await fetch(url, {
        method: "POST",
        headers: { ...reqHeaders, "content-type": "application/json" },
        body: JSON.stringify({ organizationId: lastOrgId }),
      }).catch(() => {})
    }
  }

  return (
    <SidebarShell
      header={<SidebarDashboardOrgSwitcher />}
      footer={<SidebarDashboardUserActions user={session.user} />}
    >
      {children}
    </SidebarShell>
  )
}
