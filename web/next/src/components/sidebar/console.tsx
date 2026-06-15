"use client"

import { RiArrowLeftLine, RiBookLine, RiDashboardLine } from "@remixicon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SidebarDocsContent } from "@/components/sidebar/docs"
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

export function SidebarConsoleContent() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const close = () => {
    if (isMobile) setOpenMobile(false)
  }

  // Inside the docs section the sidebar swaps to docs navigation: a back entry
  // to return to the main console menu, then the grouped doc nav (reusing the
  // public docs renderer).
  if (pathname?.startsWith("/console/docs")) {
    return (
      <>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Back" render={<Link href="/console" onClick={close} />}>
                <RiArrowLeftLine />
                <span>Back</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarDocsContent groups={config.console.groups} />
      </>
    )
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
