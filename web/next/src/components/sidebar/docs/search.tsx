"use client"

import { RiSearchLine } from "@remixicon/react"
import { useSearchContext } from "fumadocs-ui/contexts/search"

import { Kbd } from "@/components/ui/kbd"
import { SidebarInput, useSidebar } from "@/components/ui/sidebar"

export function SidebarDocsSearch() {
  const { isMobile, setOpenMobile } = useSidebar()
  const { enabled, hotKey, setOpenSearch } = useSearchContext()

  return (
    <div className="relative">
      <RiSearchLine className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
      <SidebarInput
        placeholder="Search"
        onClick={() => {
          if (enabled) {
            if (isMobile) {
              setOpenMobile(false)
            }

            setOpenSearch(true)
          }
        }}
        readOnly
        className={`cursor-pointer pl-8 ${isMobile ? "pr-3" : "pr-20"}`}
      />
      {!isMobile && enabled && hotKey.length > 0 && (
        <div className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {hotKey.map((item, index) => (
            <Kbd key={index}>{item.display}</Kbd>
          ))}
        </div>
      )}
    </div>
  )
}
