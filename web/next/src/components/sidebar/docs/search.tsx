"use client"

import { RiSearchLine } from "@remixicon/react"
import { useCallback, useEffect, useState } from "react"

import { Kbd } from "@/components/ui/kbd"
import { SidebarInput, useSidebar } from "@/components/ui/sidebar"

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

export function SidebarDocsSearch() {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleSearchTrigger = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [isMobile, setOpenMobile])

  const handleClick = useCallback(() => {
    handleSearchTrigger()

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
        key: (event: KeyboardEvent) => event.metaKey || event.ctrlKey,
      },
      {
        key: "k",
      },
    ]

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        hotKey.every((item) =>
          typeof item.key === "string" ? event.key === item.key : item.key(event),
        )
      ) {
        const target = event.target as HTMLElement

        if (
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        ) {
          return
        }

        event.preventDefault()
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
        className={`cursor-pointer pl-8 ${isMobile ? "pr-3" : "pr-20"}`}
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
