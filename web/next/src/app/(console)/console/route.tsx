import { site } from "@packages/config/site"
import { createFileRoute, Outlet } from "@tanstack/react-router"

import { SidebarConsoleContent, SidebarConsoleHeader } from "@/components/sidebar/console"
import { SidebarShell } from "@/components/sidebar/shell"
import { SidebarUserMenu } from "@/components/sidebar/user-menu"
import { SidebarMenu } from "@/components/ui/sidebar"
import { getConsoleContext } from "@/lib/auth/server-fns"
import { resolveDocsNav } from "@/lib/docs/nav"

export const Route = createFileRoute("/(console)/console")({
  // Single server-side gate for the entire /console area (every nested route): admin session or a 404, never a redirect.
  loader: () => getConsoleContext(),
  head: () => ({
    meta: [{ title: `Console | ${site.name}` }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Layout,
})

function Layout() {
  const { session, defaultOpen } = Route.useLoaderData()

  return (
    <SidebarShell
      badge="Console"
      defaultOpen={defaultOpen}
      homeHref="/console"
      header={<SidebarConsoleHeader />}
      nav={<SidebarConsoleContent docsGroups={resolveDocsNav("console")} />}
      footer={
        <SidebarMenu>
          <SidebarUserMenu user={session.user} area="console" />
        </SidebarMenu>
      }
    >
      <Outlet />
    </SidebarShell>
  )
}
