"use client"
"use no memo"

import { RiArrowDownLine, RiArrowUpLine, RiExpandUpDownLine } from "@remixicon/react"
import type { Column } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
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
  const button = (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={`Sort by ${title}`}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {column.getIsSorted() === "desc" ? (
        <RiArrowDownLine />
      ) : column.getIsSorted() === "asc" ? (
        <RiArrowUpLine />
      ) : (
        <RiExpandUpDownLine className="text-muted-foreground" />
      )}
    </Button>
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
