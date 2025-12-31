"use client"

import { useEffect, useState } from "react"

import { SearchIcon } from "lucide-react"

import { Kbd } from "@/components/ui/kbd"
import { SidebarInput, useSidebar } from "@/components/ui/sidebar"

function MetaOrControl() {
  const [key, setKey] = useState("⌘")

  useEffect(() => {
    const isWindows = window.navigator.userAgent.includes("Windows")

    if (isWindows) setKey("Ctrl")
  }, [])

  return key
}

export function SidebarDocsSearch() {
  const { isMobile, setOpenMobile } = useSidebar()

  useEffect(() => {
    const hotKey = [
      {
        key: (e: KeyboardEvent) => e.metaKey || e.ctrlKey,
      },
      {
        key: "k",
      },
    ]

    const dispatchSearchEvent = () => {
      if (isMobile) {
        setOpenMobile(false)
      }
      const event = new KeyboardEvent("keydown", {
        key: "k",
        code: "KeyK",
        metaKey: true,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
      document.dispatchEvent(event)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (hotKey.every((v) => (typeof v.key === "string" ? e.key === v.key : v.key(e)))) {
        const target = e.target as HTMLElement
        if (
          target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA"
        ) {
          return
        }

        e.preventDefault()
        dispatchSearchEvent()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isMobile, setOpenMobile])

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
    const event = new KeyboardEvent("keydown", {
      key: "k",
      code: "KeyK",
      metaKey: true,
      ctrlKey: true,
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
          <Kbd>
            <MetaOrControl />
          </Kbd>
          <Kbd>K</Kbd>
        </div>
      )}
    </div>
  )
}
