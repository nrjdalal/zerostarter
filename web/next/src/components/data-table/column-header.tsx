"use client"
"use no memo"

import { RiArrowDownLine, RiArrowUpLine, RiExpandUpDownLine } from "@remixicon/react"
import type { Column } from "@tanstack/react-table"

import { cn } from "@/lib/utils"

// Sortable column header: a plain title with an icon button toggling asc and desc (hiding lives in the view options); the title stays text, so it aligns with cell content natively. A right-aligned header mirrors the button to the left so the title stays flush with the cell text. Falls back to a plain label for non-sortable columns.
function DataTableColumnHeader<TData, TValue>({
  className,
  column,
  title,
}: {
  className?: string
  column: Column<TData, TValue>
  title: string
}) {
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>
  }

  const align = column.columnDef.meta && column.columnDef.meta.align
  // A bare icon, not a button box: still a native button for keyboard and screen readers, with only a focus ring as chrome.
  const button = (
    <button
      type="button"
      aria-label={`Sort by ${title}`}
      className="focus-visible:ring-ring/50 inline-flex rounded-sm outline-none focus-visible:ring-3"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {column.getIsSorted() === "desc" ? (
        <RiArrowDownLine className="size-4" />
      ) : column.getIsSorted() === "asc" ? (
        <RiArrowUpLine className="size-4" />
      ) : (
        <RiExpandUpDownLine className="text-muted-foreground size-4" />
      )}
    </button>
  )

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {align === "right" ? button : null}
      {title}
      {align === "right" ? null : button}
    </div>
  )
}

export { DataTableColumnHeader }
