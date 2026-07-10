"use client"

import { usePathname } from "next/navigation"

import { Sidebar } from "@/components/ui/sidebar"
import { isDocsPath } from "@/lib/docs"

// The shell sidebar is an icon rail in the app, but offcanvas inside the docs area: icon-less doc trees don't collapse to a rail cleanly, whereas offcanvas hides fully and pairs with the floating edge tab.
export function SidebarAdaptive({ children }: { children: React.ReactNode }) {
  const collapsible = isDocsPath(usePathname()) ? "offcanvas" : "icon"

  return <Sidebar collapsible={collapsible}>{children}</Sidebar>
}
