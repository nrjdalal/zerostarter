"use client"

import { useLayoutEffect, useState } from "react"

import { SearchIcon } from "lucide-react"

import { useIsMac } from "@/hooks/use-platform"
import { Kbd } from "@/components/ui/kbd"
import { SidebarInput, useSidebar } from "@/components/ui/sidebar"

export function SidebarSearch() {
  const isMac = useIsMac()
  const [mounted, setMounted] = useState(false)
  const { isMobile, setOpenMobile } = useSidebar()

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
    const event = new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(event)
  }

  return (
    <div className="relative">
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
      <SidebarInput
        placeholder="Search"
        onClick={handleClick}
        readOnly
        className={`cursor-pointer pl-8 ${isMobile ? "pr-3" : "pr-20"}`}
      />
      {!isMobile && (
        <div className="pointer-events-none absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {mounted ? (
            <>
              <Kbd className="text-xs">{isMac ? "cmd" : "ctrl"}</Kbd>
              <Kbd>K</Kbd>
            </>
          ) : (
            <div className="flex items-center gap-1 opacity-0">
              <Kbd className="text-xs">ctrl</Kbd>
              <Kbd>K</Kbd>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
