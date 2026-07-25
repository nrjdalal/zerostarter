"use client"

import * as React from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Overflow behavior for text cells, so column widths never move with content: "truncate" keeps one line with an ellipsis and reveals the full value in a tooltip only when actually cut (measured on hover/focus); "wrap" flows onto multiple lines and lets the self-measured virtual row grow.
function DataTableCellText({
  children,
  className,
  mode = "truncate",
}: {
  children: React.ReactNode
  className?: string
  mode?: "truncate" | "wrap"
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = React.useState(false)

  if (mode === "wrap") {
    return (
      <span className={cn("min-w-0 whitespace-normal wrap-break-word", className)}>{children}</span>
    )
  }

  const measure = () => {
    const element = ref.current
    if (element) setTruncated(element.scrollWidth > element.clientWidth)
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            ref={ref}
            onMouseEnter={measure}
            onFocus={measure}
            className={cn("min-w-0 truncate", className)}
          />
        }
      >
        {children}
      </TooltipTrigger>
      {truncated && <TooltipContent>{children}</TooltipContent>}
    </Tooltip>
  )
}

export { DataTableCellText }
