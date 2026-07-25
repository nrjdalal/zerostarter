"use client"
"use no memo"

import { flexRender, type RowData, type Table as TableInstance } from "@tanstack/react-table"
import * as React from "react"

import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Column labels for the view-options dropdown live on columnDef.meta, so ids like "createdAt" can render as "Created".
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string
  }
}

interface DataTableProps<TData> {
  "aria-label": string
  empty?: React.ReactNode
  hasMore?: boolean
  isLoading?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  table: TableInstance<TData>
  total?: number
}

// Renders a table instance the page owns (useReactTable) as an infinite-scroll region: sticky header, rows, a sentinel that calls onLoadMore near the bottom, a spinner while loading, and an Empty fallback. The wrapper is the scroll container, focusable and named so keyboard users can reach the overflow; the inner shadcn container is flattened via its data-slot.
function DataTable<TData>({
  "aria-label": ariaLabel,
  empty,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  onLoadMore,
  table,
  total,
}: DataTableProps<TData>) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLTableRowElement>(null)

  const columns = table.getVisibleLeafColumns()
  const rows = table.getRowModel().rows
  const selectable = table.getAllLeafColumns().some((column) => column.id === "select")

  // Recreated whenever the gate flips or rows land, so the fresh observer immediately reports a still-visible sentinel and chain-loads until the viewport fills or the list ends.
  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!onLoadMore || !sentinel || !hasMore || isLoading || isLoadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore()
      },
      { root: containerRef.current, rootMargin: "200px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, onLoadMore, rows.length])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        ref={containerRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        className="focus-visible:border-ring focus-visible:ring-ring/50 min-h-0 flex-1 overflow-auto rounded-md border outline-none focus-visible:ring-3 [&_[data-slot=table-container]]:overflow-visible"
      >
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length}>
                  {/* The region's height comes from the flex chain, not its content, so the frame holds when rows land; the fixed block just keeps the spinner away from the header. */}
                  <div className="flex h-96 items-center justify-center">
                    <Spinner />
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              <>
                {rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {isLoadingMore && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns.length}>
                      <div className="flex items-center justify-center py-2">
                        <Spinner />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {onLoadMore && (
                  <TableRow ref={sentinelRef} aria-hidden="true" className="hover:bg-transparent">
                    <TableCell colSpan={columns.length} className="h-px p-0" />
                  </TableRow>
                )}
              </>
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length}>
                  {empty ? (
                    empty
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>No results</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {(selectable || typeof total === "number") && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <div>
            {selectable
              ? `${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} row(s) selected`
              : null}
          </div>
          {typeof total === "number" && !isLoading && (
            <div>
              {rows.length} of {total}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { DataTable }
