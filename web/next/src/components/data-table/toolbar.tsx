"use client"
"use no memo"

import { RiCloseLine } from "@remixicon/react"
import type { Table as TableInstance } from "@tanstack/react-table"

import { DataTableViewOptions } from "@/components/data-table/view-options"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Search box wired to the table's global filter, a children slot for faceted filters, a reset button once anything filters, and the view-options toggle.
function DataTableToolbar<TData>({
  children,
  searchPlaceholder = "Search...",
  table,
}: {
  children?: React.ReactNode
  searchPlaceholder?: string
  table: TableInstance<TData>
}) {
  const globalFilter = table.getState().globalFilter
  const search = typeof globalFilter === "string" ? globalFilter : ""
  const isFiltered = search !== "" || table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center gap-2">
        <Input
          type="search"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="w-40 lg:w-64"
        />
        {children}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters()
              table.resetGlobalFilter()
            }}
          >
            Reset
            <RiCloseLine />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}

export { DataTableToolbar }
