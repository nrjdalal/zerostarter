"use client"

import { RiSearchLine } from "@remixicon/react"

import { useDocsSearchContext } from "@/components/sidebar/docs/search-provider"
import { Kbd } from "@/components/ui/kbd"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function SidebarDocsSearch() {
  const { isMobile, setOpenMobile } = useSidebar()
  const { enabled, hotKey, setOpenSearch } = useDocsSearchContext()

  return (
    <div className="relative">
      <RiSearchLine className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label="Open search"
        onClick={() => {
          if (enabled) {
            if (isMobile) {
              setOpenMobile(false)
            }

            setOpenSearch(true)
          }
        }}
        className={cn(
          "h-8 w-full rounded-lg border border-input bg-background pl-8 text-left text-sm text-muted-foreground shadow-none transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          isMobile ? "pr-3" : "pr-20",
        )}
      >
        Search
      </button>
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
