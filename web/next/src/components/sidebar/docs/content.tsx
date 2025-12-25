"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { ChevronRight } from "lucide-react"

import { config } from "@/lib/config"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function SidebarDocsContent() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const isCategoryActive = (items: ReadonlyArray<{ readonly url: string }>) => {
    return items.some(
      (item) =>
        pathname === item.url ||
        pathname === item.url + "/" ||
        pathname?.startsWith(item.url + "/"),
    )
  }

  const isItemActive = (url: string) => {
    return pathname === url || pathname === url + "/" || pathname?.startsWith(url + "/")
  }

  return (
    <>
      {config.sidebar.groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel className="pl-2.5">{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {"items" in group &&
              group.items.map((item) => {
                const isActive = pathname === item.url || pathname === item.url + "/"

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.url}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false)
                          }
                        }}
                      >
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            {"categories" in group &&
              Object.entries(group.categories).map(([category, items]) => {
                const isOpen = isCategoryActive(items)

                return (
                  <Collapsible key={category} asChild defaultOpen={isOpen} className="group">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={category}>
                          <ChevronRight className="transition-transform duration-200 group-data-[state=open]:rotate-90" />
                          <span>{category}</span>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {items.map((item) => {
                            const isActive = isItemActive(item.url)
                            return (
                              <SidebarMenuSubItem key={item.url}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                  <Link
                                    href={item.url}
                                    onClick={() => {
                                      if (isMobile) {
                                        setOpenMobile(false)
                                      }
                                    }}
                                  >
                                    <span>{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
