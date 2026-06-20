"use client"

import { RiExpandUpDownLine } from "@remixicon/react"
import { type ReactNode } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type Identity = {
  leading: ReactNode
  primary: ReactNode
  secondary: ReactNode
  secondaryClassName?: string
}

function SidebarIdentity({ primary, secondary, secondaryClassName }: Omit<Identity, "leading">) {
  return (
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{primary}</span>
      <span className={cn("truncate text-xs", secondaryClassName)}>{secondary}</span>
    </div>
  )
}

// Shared sidebar footer dropdown used by the user menu and org switcher: a SidebarMenuButton trigger (leading visual + identity + expand chevron) over a content panel that repeats the identity as a header, then the consumer's items, keeping the trigger/content/identity markup in one place.
export function SidebarDropdownMenu({
  trigger,
  header,
  align,
  mobileSide,
  children,
}: {
  trigger: Identity
  header: Identity
  align: "start" | "end"
  mobileSide: "top" | "bottom"
  children: ReactNode
}) {
  const { isMobile } = useSidebar()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer border"
          />
        }
      >
        {trigger.leading}
        <SidebarIdentity
          primary={trigger.primary}
          secondary={trigger.secondary}
          secondaryClassName={trigger.secondaryClassName}
        />
        <RiExpandUpDownLine className="ml-auto size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn("w-(--anchor-width) min-w-56 rounded-lg", isMobile ? "mb-1" : "ml-3")}
        side={isMobile ? mobileSide : "right"}
        align={align}
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              {header.leading}
              <SidebarIdentity
                primary={header.primary}
                secondary={header.secondary}
                secondaryClassName={header.secondaryClassName}
              />
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
