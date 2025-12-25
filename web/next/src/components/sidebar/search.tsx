"use client"

import { useEffect } from "react"

import { SearchIcon } from "lucide-react"

import { useIsMac } from "@/hooks/use-platform"
import { Kbd } from "@/components/ui/kbd"
import { SidebarInput, useSidebar } from "@/components/ui/sidebar"

export function SidebarSearch() {
  const isMac = useIsMac()
  const { isMobile, setOpenMobile } = useSidebar()

  const dispatchSearchEvent = () => {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Press "s" to trigger search (Cmd/Ctrl+K)
      if (e.key === "s" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return
        }
        e.preventDefault()
        dispatchSearchEvent()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMac, isMobile])

  const handleClick = () => {
    dispatchSearchEvent()
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
          <Kbd>S</Kbd>
        </div>
      )}
    </div>
  )
}
