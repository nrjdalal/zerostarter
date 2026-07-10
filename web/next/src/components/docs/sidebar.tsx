"use client"

import { env } from "@packages/env/web-next"
import { RiArrowRightSLine, RiSearchLine } from "@remixicon/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Kbd } from "@/components/ui/kbd"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { config } from "@/lib/config"
import type { NavGroup, NavItem, NavNode } from "@/lib/docs"
import { cn, isActive as isActivePath } from "@/lib/utils"

const isPage = (node: NavNode): node is NavItem => "url" in node

function collectUrls(nodes: NavNode[]): string[] {
  return nodes.flatMap((node) => (isPage(node) ? [node.url] : collectUrls(node.items)))
}

export function DocsNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const isActive = (url: string): boolean => isActivePath(pathname, url)
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
        <span>{group.label}</span>
        <RiArrowRightSLine className="ml-auto transition-transform duration-200 group-data-[open]:rotate-90" />
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

export function DocsFooter() {
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

function isMacPlatform(): boolean {
  return typeof window !== "undefined" && window.navigator.userAgent.includes("Mac")
}

function MetaOrControl() {
  const [key, setKey] = useState<string | null>(null)
  useEffect(() => {
    setKey(isMacPlatform() ? "⌘" : "Ctrl")
  }, [])
  return key ?? "⌘"
}

export function DocsSearch() {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleSearchTrigger = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile, setOpenMobile])

  const handleClick = useCallback(() => {
    handleSearchTrigger()
    // Dispatch keyboard event for fumadocs to catch
    const isMac = isMacPlatform()
    const event = new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(event)
  }, [handleSearchTrigger])

  useEffect(() => {
    const hotKey = [
      {
        key: (e: KeyboardEvent) => e.metaKey || e.ctrlKey,
      },
      {
        key: "k",
      },
    ]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (hotKey.every((v) => (typeof v.key === "string" ? e.key === v.key : v.key(e)))) {
        const target = e.target as HTMLElement
        if (
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        ) {
          return
        }

        e.preventDefault()
        handleSearchTrigger()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleSearchTrigger])

  return (
    <div className="relative">
      <RiSearchLine className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
      <SidebarInput
        placeholder="Search"
        onClick={handleClick}
        readOnly
        className={cn("cursor-default pl-8", isMobile ? "pr-3" : "pr-20")}
      />
      {!isMobile && (
        <div className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          <Kbd>
            <MetaOrControl />
          </Kbd>
          <Kbd>K</Kbd>
        </div>
      )}
    </div>
  )
}
