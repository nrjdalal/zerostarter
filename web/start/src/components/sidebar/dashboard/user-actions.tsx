import { RiBookLine } from "@remixicon/react"
import { Link } from "@tanstack/react-router"
import { type User } from "better-auth/types"

import { SidebarUserMenu } from "@/components/sidebar/user-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { config } from "@/lib/config"

export function SidebarDashboardUserActions({
  user,
  canAccessConsole,
}: {
  user: User
  canAccessConsole: boolean
}) {
  return (
    <SidebarMenu className="space-y-1.5">
      <SidebarMenuItem>
        <SidebarMenuButton render={<Link to="/docs" />}>
          <RiBookLine />
          <span>Documentation</span>
          <span className="text-muted-foreground ml-auto text-xs">v{config.app.version}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarUserMenu user={user} area={canAccessConsole ? "dashboard" : undefined} />
    </SidebarMenu>
  )
}
