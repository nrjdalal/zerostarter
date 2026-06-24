"use client"

import { RiBookLine, RiDashboardLine } from "@remixicon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SidebarDocsContent, SidebarDocsSearch } from "@/components/sidebar/docs"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { NavGroup } from "@/lib/docs/types"

const mainItems = [
  { title: "Documentation", url: "/console/docs", icon: RiBookLine, exact: false },
] as const

// Sidebar-header slot: the console home ("Dashboard") link, plus the docs search inside /console/docs (matching public /docs).
export function SidebarConsoleHeader() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const close = () => {
    if (isMobile) setOpenMobile(false)
  }
  const isDocs = pathname ? pathname.startsWith("/console/docs") : false

  return (
    <>
      {!isDocs && (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/console" || pathname === "/console/"}
              tooltip="Dashboard"
              className="data-active:font-normal"
              render={<Link href="/console" onClick={close} />}
            >
              <RiDashboardLine />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
      {isDocs && (
        <div className="group-data-[collapsible=icon]:hidden">
          <SidebarDocsSearch />
        </div>
      )}
    </>
  )
}

export function SidebarConsoleContent({ docsGroups }: { docsGroups: NavGroup[] }) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const close = () => {
    if (isMobile) setOpenMobile(false)
  }

  // Docs section swaps to the grouped doc nav (search is in the header; the brand links back to /console).
  if (pathname?.startsWith("/console/docs")) {
    return <SidebarDocsContent groups={docsGroups} />
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="pl-2.5">Getting Started</SidebarGroupLabel>
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
