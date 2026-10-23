import { consoleRole } from "@packages/auth/access"
import type { Metadata } from "next"

import { ConsoleRoleProvider } from "@/components/console/role"
import { ConsoleHeader, ConsoleNav } from "@/components/console/sidebar"
import { SidebarShell } from "@/components/shell/sidebar-shell"
import { SidebarUserMenu } from "@/components/shell/sidebar-user-menu"
import { SidebarMenu } from "@/components/ui/sidebar"
import { assertConsoleAccess } from "@/lib/auth/console"
import { resolveDocsNav } from "@/lib/docs"

// Force per-request rendering so the console is never statically prerendered or cached for anonymous users; the access check below runs whenever this layout renders (a full load, or a client navigation into the console from outside it), not on a client navigation between console pages.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Console",
  robots: { index: false, follow: false },
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Asserts member only when this layout renders, which a client navigation between console pages does not do: a page that needs more asserts it itself, and the console docs pages rely on this alone.
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
