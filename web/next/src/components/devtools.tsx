"use client"

import { RiCodeLine } from "@remixicon/react"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools/production"
import { useEffect, useState } from "react"

export function DevTools() {
  const [expandDevtools, setExpandDevtools] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    function updateDimensions() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [])

  const { width, height } = dimensions

  return (
    <div className="bg-background text-primary fixed right-0 bottom-0 z-100 flex items-center gap-1.5 rounded-tl-lg border-t border-l font-mono text-xs font-medium select-none">
      {expandDevtools && (
        <>
          <ReactQueryDevtools buttonPosition="top-right" />
          <span className="ml-1">{width.toLocaleString()}</span>
          <span>x</span>
          <span>{height.toLocaleString()}</span>
          <div className="h-4 w-px bg-zinc-500" />
          <span className="sm:hidden">XS</span>
          <span className="hidden sm:inline md:hidden">SM</span>
          <span className="hidden md:inline lg:hidden">MD</span>
          <span className="hidden lg:inline xl:hidden">LG</span>
          <span className="hidden xl:inline 2xl:hidden">XL</span>
          <span className="hidden 2xl:inline">2XL</span>
          <div className="-mr-1.5 h-4 w-px bg-zinc-500" />
        </>
      )}

      <button
        type="button"
        aria-label="Toggle devtools"
        onClick={() => setExpandDevtools(!expandDevtools)}
      >
        <RiCodeLine className="size-8 p-1.5" />
      </button>
    </div>
  )
}
