"use client"

import { features } from "@packages/config/site"
import {
  RiBookLine,
  RiDashboardLine,
  RiGroupLine,
  type RemixiconComponentType,
} from "@remixicon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { DocsNav, DocsSearch } from "@/components/docs/sidebar"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { NavGroup } from "@/lib/docs"
import { isActive } from "@/lib/utils"

type ConsoleNavItem = {
  // omit for an exact match (isActive's own default); false also matches child paths
  exact?: boolean
  feature?: keyof typeof features
  icon: RemixiconComponentType
  title: string
  url: string
}

const navGroups: { items: ConsoleNavItem[]; label: string }[] = [
  {
    items: [
      {
        exact: false,
        feature: "internalDocs",
        icon: RiBookLine,
        title: "Documentation",
        url: "/console/docs",
      },
    ],
    label: "Getting Started",
  },
  {
    items: [
      {
        exact: false,
        icon: RiGroupLine,
        title: "Users",
        url: "/console/users",
      },
    ],
    label: "Platform",
  },
]

// Sidebar-header slot: the console home ("Dashboard") link, plus the docs search inside /console/docs (matching public /docs).
export function ConsoleHeader() {
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
              isActive={isActive(pathname, "/console")}
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
          <DocsSearch />
        </div>
      )}
    </>
  )
}

export function ConsoleNav({ docsGroups }: { docsGroups: NavGroup[] }) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const close = () => {
    if (isMobile) setOpenMobile(false)
  }

  // Docs section swaps to the grouped doc nav (search is in the header; the brand links back to /console).
  if (pathname?.startsWith("/console/docs")) {
    return <DocsNav groups={docsGroups} />
  }

  // Drop items whose feature is off, and a whole group with them when nothing is left.
  const groups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.feature || features[item.feature]),
    }))
    .filter((group) => group.items.length > 0)
  if (groups.length === 0) return null

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel className="pl-2.5">{group.label}</SidebarGroupLabel>
          <SidebarMenu className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.url, { exact: item.exact })

              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={active}
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
      ))}
    </>
  )
}
