"use client"

import { RiBookLine, RiDashboardLine } from "@remixicon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SidebarDocsContent, SidebarDocsSearch } from "@/components/sidebar/docs"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { config } from "@/lib/config"

const mainItems = [
  { title: "Dashboard", url: "/console", icon: RiDashboardLine, exact: true },
  { title: "Documentation", url: "/console/docs", icon: RiBookLine, exact: false },
] as const

// Sidebar-header slot: shows the docs search only inside /console/docs (matching public /docs); hidden when collapsed to icons.
export function SidebarConsoleHeader() {
  const pathname = usePathname()
  if (!pathname?.startsWith("/console/docs")) return null

  return (
    <div className="group-data-[collapsible=icon]:hidden">
      <SidebarDocsSearch />
    </div>
  )
}

export function SidebarConsoleContent() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const close = () => {
    if (isMobile) setOpenMobile(false)
  }

  // Docs section swaps to the grouped doc nav (search is in the header; the brand links back to /console).
  if (pathname?.startsWith("/console/docs")) {
    return <SidebarDocsContent groups={config.console.groups} />
  }

  return (
    <SidebarGroup>
      <SidebarMenu className="space-y-0.5">
        {mainItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.url || pathname === item.url + "/"
            : pathname === item.url || pathname?.startsWith(item.url + "/")

          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={item.title}
                className="data-active:font-normal"
                render={<Link href={item.url} onClick={close} />}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
