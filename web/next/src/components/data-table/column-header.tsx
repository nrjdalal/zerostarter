"use client"
"use no memo"

import { RiArrowDownLine, RiArrowUpLine, RiExpandUpDownLine, RiEyeOffLine } from "@remixicon/react"
import type { Column } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// Sortable column header: a ghost-button dropdown with asc/desc (and hide when the column allows it). Falls back to a plain label for non-sortable columns.
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

  // The margin nudge lines the button label up with cell text on the aligned side; centered headers take none.
  const align = column.columnDef.meta && column.columnDef.meta.align
  const nudge = align === "right" ? "-mr-2.5" : align === "center" ? undefined : "-ml-2.5"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className={cn(nudge, className)} />}>
        {title}
        {column.getIsSorted() === "desc" ? (
          <RiArrowDownLine />
        ) : column.getIsSorted() === "asc" ? (
          <RiArrowUpLine />
        ) : (
          <RiExpandUpDownLine className="text-muted-foreground" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <RiArrowUpLine />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <RiArrowDownLine />
            Desc
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {column.getCanHide() && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <RiEyeOffLine />
                Hide
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { DataTableColumnHeader }
