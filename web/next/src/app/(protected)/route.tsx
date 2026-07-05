import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import {
  SidebarDashboardOrgSwitcher,
  SidebarDashboardUserActions,
} from "@/components/sidebar/dashboard"
import { SidebarShell } from "@/components/sidebar/shell"
import { getProtectedContext } from "@/lib/auth/server-fns"

export const Route = createFileRoute("/(protected)")({
  loader: async () => {
    const context = await getProtectedContext()
    if (!context) throw redirect({ to: "/" })
    return context
  },
  component: Layout,
})

function Layout() {
  const { session, defaultOpen } = Route.useLoaderData()

  return (
    <SidebarShell
      defaultOpen={defaultOpen}
      header={<SidebarDashboardOrgSwitcher />}
      footer={
        <SidebarDashboardUserActions
          user={session.user}
          canAccessConsole={session.user.role === "admin"}
        />
      }
    >
      <Outlet />
    </SidebarShell>
  )
}
