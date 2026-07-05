"use client"

import { env } from "@packages/env/web-next"
import Link from "next/link"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { config } from "@/lib/config"

export function SidebarDocsFooter() {
  if (env.NEXT_PUBLIC_USERJOT_URL) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={
              <Link href={env.NEXT_PUBLIC_USERJOT_URL} target="_blank" rel="noopener noreferrer" />
            }
          >
            <span>Feedback</span>
            <span className="text-muted-foreground ml-auto text-xs">v{config.app.version}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="text-muted-foreground px-2 py-1.5 text-xs">v{config.app.version}</div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
