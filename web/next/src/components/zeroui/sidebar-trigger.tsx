"use client"

import * as React from "react"

import { PanelLeftIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

function SidebarTrigger({
  className,
  onClick,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="secondary"
      size={children ? undefined : "icon"}
      className={cn(children ? undefined : "size-7", "md:size-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeftIcon />
      {children && <span className="md:hidden">{children}</span>}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

export { SidebarTrigger }

// used at `@/app/docs/layout.tsx`
