"use client"
"use no memo"

import { RiArrowDownLine, RiArrowUpLine, RiExpandUpDownLine } from "@remixicon/react"
import type { Column } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Sortable column header: a ghost button toggling asc and desc on click (hiding lives in the view options). Falls back to a plain label for non-sortable columns.
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

  // The margin nudge lines the button label up with cell text on the aligned side; centered headers take none. A right-aligned header mirrors the sort icon to the left so the title stays flush with the cell text.
  const align = column.columnDef.meta && column.columnDef.meta.align
  const nudge = align === "right" ? "-mr-2.5" : align === "center" ? undefined : "-ml-2.5"
  const icon =
    column.getIsSorted() === "desc" ? (
      <RiArrowDownLine />
    ) : column.getIsSorted() === "asc" ? (
      <RiArrowUpLine />
    ) : (
      <RiExpandUpDownLine className="text-muted-foreground" />
    )

  return (
    <Button
      variant="ghost"
      className={cn(nudge, className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {align === "right" ? icon : null}
      {title}
      {align === "right" ? null : icon}
    </Button>
  )
}

export { DataTableColumnHeader }
