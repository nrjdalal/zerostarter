"use client"

import { RiArrowRightSLine } from "@remixicon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

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
import type { NavGroup, NavItem, NavNode } from "@/lib/docs/types"

const isPage = (node: NavNode): node is NavItem => "url" in node

function collectUrls(nodes: NavNode[]): string[] {
  return nodes.flatMap((node) => (isPage(node) ? [node.url] : collectUrls(node.items)))
}

export function SidebarDocsContent({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const isActive = (url: string): boolean =>
    pathname === url || pathname === url + "/" || (pathname?.startsWith(url + "/") ?? false)
  const close = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel className="pl-2.5">{group.label}</SidebarGroupLabel>
          <SidebarMenu
            className={group.items.some((node) => !isPage(node)) ? "space-y-0" : "space-y-0.5"}
          >
            {group.items.map((node) => (
              <NavTreeNode
                key={isPage(node) ? node.url : node.label}
                node={node}
                sub={false}
                isActive={isActive}
                close={close}
              />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}

function NavTreeNode({
  node,
  sub,
  isActive,
  close,
}: {
  node: NavNode
  sub: boolean
  isActive: (url: string) => boolean
  close: () => void
}) {
  if (!isPage(node)) {
    return <NavTreeGroup group={node} sub={sub} isActive={isActive} close={close} />
  }

  const active = isActive(node.url)

  if (sub) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton isActive={active} render={<Link href={node.url} onClick={close} />}>
          <span>{node.title}</span>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }

  const isSetupItem = node.url === "/docs/getting-started/setup"
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className={isSetupItem ? "border data-active:font-normal" : "data-active:font-normal"}
        render={<Link href={node.url} onClick={close} />}
      >
        <span>{node.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavTreeGroup({
  group,
  sub,
  isActive,
  close,
}: {
  group: NavGroup
  sub: boolean
  isActive: (url: string) => boolean
  close: () => void
}) {
  const active = collectUrls(group.items).some((url) => isActive(url))
  const [open, setOpen] = useState(active)

  useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  const Trigger = sub ? SidebarMenuSubButton : SidebarMenuButton
  const Item = sub ? SidebarMenuSubItem : SidebarMenuItem

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      defaultOpen={active}
      className="group"
      render={<Item />}
    >
      <CollapsibleTrigger render={<Trigger {...(sub ? {} : { tooltip: group.label })} />}>
        <RiArrowRightSLine className="transition-transform duration-200 group-data-[state=open]:rotate-90" />
        <span>{group.label}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub className="mr-0 gap-y-0.5 pr-0 pl-2">
          {group.items.map((node) => (
            <NavTreeNode
              key={isPage(node) ? node.url : node.label}
              node={node}
              sub={true}
              isActive={isActive}
              close={close}
            />
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}
