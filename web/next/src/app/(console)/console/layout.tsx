import { consoleRole } from "@packages/auth/access"
import type { Metadata } from "next"

import { ConsoleRoleProvider } from "@/components/console/role"
import { ConsoleHeader, ConsoleNav } from "@/components/console/sidebar"
import { SidebarShell } from "@/components/shell/sidebar-shell"
import { SidebarUserMenu } from "@/components/shell/sidebar-user-menu"
import { SidebarMenu } from "@/components/ui/sidebar"
import { assertConsoleAccess } from "@/lib/auth/console"
import { resolveDocsNav } from "@/lib/docs"

// Force per-request rendering so the access check runs on every request and the console is never statically prerendered/cached for anonymous users.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Console",
  robots: { index: false, follow: false },
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Single server-side gate for the entire /console area (every nested route).
  const session = await assertConsoleAccess()

  return (
    // Wraps the whole shell, not just children: the nav decides which groups to show from this role, and a slot rendered outside the provider would fall back to the default and hide them.
    <ConsoleRoleProvider id={session.user.id} role={consoleRole(session.user.role)}>
      <SidebarShell
        badge="Console"
        homeHref="/console"
        header={<ConsoleHeader />}
        nav={<ConsoleNav docsGroups={resolveDocsNav("console")} />}
        footer={
          <SidebarMenu>
            <SidebarUserMenu user={session.user} area="console" />
          </SidebarMenu>
        }
      >
        {children}
      </SidebarShell>
    </ConsoleRoleProvider>
  )
}
