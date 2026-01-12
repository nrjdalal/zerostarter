"use client"

import { env } from "@packages/env/web-next"
import Link from "next/link"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

export function SidebarDocsFooter() {
  if (!env.NEXT_PUBLIC_USERJOT_URL) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link href={env.NEXT_PUBLIC_USERJOT_URL} target="_blank" rel="noopener noreferrer">
            <span>Feedback</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
