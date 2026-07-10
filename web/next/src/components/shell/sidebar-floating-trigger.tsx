"use client"

import { usePathname } from "next/navigation"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { isDocsPath } from "@/lib/docs"
import { cn } from "@/lib/utils"

// Shared floating sidebar trigger. In the docs area the sidebar is offcanvas, so on desktop this becomes an edge tab; elsewhere the in-sidebar header trigger covers desktop and this stays hidden. On mobile it's always a labeled button bottom-right. Label: "Docs" in docs, "Menu" elsewhere.
export function SidebarFloatingTrigger() {
  const isDocs = isDocsPath(usePathname())

  return (
    <SidebarTrigger
      variant="secondary"
      size="default"
      className={cn(
        "bg-sidebar fixed right-0 bottom-0 z-20 mr-6 mb-16 h-8 border",
        isDocs ? "md:right-auto md:mb-48 md:size-7 md:rounded-l-none md:border-l-0" : "md:hidden",
      )}
    >
      <span className={cn(isDocs && "md:hidden")}>{isDocs ? "Docs" : "Menu"}</span>
    </SidebarTrigger>
  )
}
