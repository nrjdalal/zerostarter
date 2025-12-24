"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Book,
  BookOpen,
  Bot,
  Brain,
  Building2,
  ChevronRight,
  Cloud,
  Code,
  Download,
  FileText,
  FolderTree,
  GitBranch,
  Map,
  MessageSquare,
  Rocket,
  Settings,
  Terminal,
  type LucideIcon,
} from "lucide-react"

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
} from "@/components/ui/sidebar"

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  Building2,
  FolderTree,
  Code,
  Download,
  Terminal,
  FileText,
  Book,
  MessageSquare,
  Settings,
  Rocket,
  Brain,
  Bot,
  Map,
  Cloud,
  GitBranch,
}

// Helper to get icon component by name
const getIcon = (iconName: string | undefined) => {
  if (!iconName) return null
  const IconComponent = iconMap[iconName]
  return IconComponent ? <IconComponent className="size-4" /> : null
}

export function SidebarDocs() {
  const pathname = usePathname()

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
                      <Link href={item.url}>
                        {getIcon(item.icon)}
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
                                  <Link href={item.url}>
                                    {getIcon(item.icon)}
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
