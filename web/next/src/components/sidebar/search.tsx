"use client"

import { useLayoutEffect, useRef, useState } from "react"

import { SearchIcon } from "lucide-react"

import { useIsMac } from "@/hooks/use-platform"
import { Kbd } from "@/components/ui/kbd"
import { SidebarInput, useSidebar } from "@/components/ui/sidebar"

export function SidebarSearch() {
  const isMac = useIsMac()
  const [mounted, setMounted] = useState(false)
  const { isMobile, setOpenMobile } = useSidebar()
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false)
      // Fumadocs SearchDialogInput is a plain input inside SearchDialogContent (Radix Dialog)
      // Try to find the input within the open dialog
      const searchInput =
        (document.querySelector('[role="dialog"] input[type="text"]') as HTMLInputElement) ||
        (document.querySelector('[role="dialog"] input:not([type])') as HTMLInputElement) ||
        (document.querySelector('[data-state="open"] input') as HTMLInputElement)

      if (searchInput) {
        searchInput.focus()
      } else {
        const event = new KeyboardEvent("keydown", {
          key: "k",
          code: "KeyK",
          bubbles: true,
          cancelable: true,
        })
        document.dispatchEvent(event)
        setTimeout(() => {
          const input =
            (document.querySelector('[role="dialog"] input[type="text"]') as HTMLInputElement) ||
            (document.querySelector('[role="dialog"] input:not([type])') as HTMLInputElement) ||
            (document.querySelector('[data-state="open"] input') as HTMLInputElement)
          input?.focus()
        }, 100)
      }
    } else {
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
  }

  return (
    <div className="relative">
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
      <SidebarInput
        ref={inputRef}
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
