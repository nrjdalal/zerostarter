import { reachesConsole } from "@packages/auth/access"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { DashboardFooter, OrgSwitcher } from "@/components/dashboard/sidebar"
import { SidebarShell } from "@/components/shell/sidebar-shell"
import { auth } from "@/lib/auth"
import { config } from "@/lib/config"

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Past the cookie cache, like the console's own gate. The Console cross-link is drawn from this, and the browser holds a session snapshot for the cache window, so a cached read leaves someone you just promoted unable to see the console they now have: the link is how they would find it, and /console already lets them in. Costs a session lookup on the API side of a round trip that happens anyway.
  const session = await auth.api.getSession({ disableCookieCache: true })

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
        <DashboardFooter user={session.user} canAccessConsole={reachesConsole(session.user)} />
      }
    >
      {children}
    </SidebarShell>
  )
}
