"use client"
"use no memo"

import { isDevelopment } from "@packages/env"
import { env } from "@packages/env/web-next"
import {
  flexRender,
  type Column,
  type RowData,
  type Table as TableInstance,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import * as React from "react"

import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"

// Column labels for the view-options dropdown live on columnDef.meta, so ids like "createdAt" can render as "Created"; flex marks the column that absorbs leftover width (virtualized rows need explicit sizes).
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    flex?: boolean
    label?: string
    right?: boolean
  }
}

// Estimated data-row height for the virtualizer's scrollbar math; rows self-measure after render.
const ROW_ESTIMATE_PX = 45

// next dev only (a build inlines production): alternating column tints make the column boxes visible while tuning widths in column-sizes.ts.
const DEBUG_COLUMN_COLORS = isDevelopment(env.NEXT_PUBLIC_NODE_ENV)
const debugColumnClass = (index: number) =>
  DEBUG_COLUMN_COLORS ? (index % 2 ? "bg-destructive/10" : "bg-primary/10") : undefined

interface DataTableProps<TData> {
  "aria-label": string
  empty?: React.ReactNode
  hasMore?: boolean
  isError?: boolean
  isLoading?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  onRetry?: () => void
  table: TableInstance<TData>
  total?: number
}

// Renders a table instance the page owns (useReactTable) as a virtualized infinite-scroll region, following TanStack Table's virtualized-infinite-scrolling example: semantic table tags flipped to grid/flex so absolutely positioned virtual rows work, a sticky header, onLoadMore fired within 500px of the bottom, a spinner while loading, and an Empty fallback. The wrapper is the scroll container, focusable and named so keyboard users can reach the overflow; the inner shadcn container is flattened via its data-slot.
function DataTable<TData>({
  "aria-label": ariaLabel,
  empty,
  hasMore = false,
  isError = false,
  isLoading = false,
  isLoadingMore = false,
  onLoadMore,
  onRetry,
  table,
  total,
}: DataTableProps<TData>) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  const rows = table.getRowModel().rows
  const selectable = table.getAllLeafColumns().some((column) => column.id === "select")

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => ROW_ESTIMATE_PX,
    getScrollElement: () => containerRef.current,
    // Measure real row heights, except in Firefox, which measures table border heights incorrectly (upstream guidance).
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  })

  // Fetch the next batch once the user scrolls within 500px of the bottom; also checked after every batch so a not-yet-full region keeps loading.
  const loadMoreOnBottomReached = React.useCallback(
    (container: HTMLDivElement | null) => {
      if (!container || !onLoadMore || !hasMore || isLoading || isLoadingMore) return
      const { clientHeight, scrollHeight, scrollTop } = container
      if (scrollHeight - scrollTop - clientHeight < 500) onLoadMore()
    },
    [hasMore, isLoading, isLoadingMore, onLoadMore],
  )
  React.useEffect(() => {
    loadMoreOnBottomReached(containerRef.current)
  }, [loadMoreOnBottomReached, rows.length])

  // Back to the top whenever sorting, search, or filters reshape the list; these state slices keep stable identities between changes, so they work as deps directly. The virtualizer instance is stable and deliberately not a dep.
  const { columnFilters, globalFilter, sorting } = table.getState()
  React.useEffect(() => {
    if (rowVirtualizer.getVirtualItems().length) rowVirtualizer.scrollToIndex(0)
  }, [columnFilters, globalFilter, sorting])

  // The one column marked meta.flex absorbs leftover width (its size acts as a floor); the rest hold their size, so on narrow viewports the row overflows into the region's horizontal scroll instead of crushing cells. In a table with no flex column, the first meta.right column takes ml-auto so it and everything after dock to the right edge.
  const rightStart = table
    .getVisibleLeafColumns()
    .find((column) => column.columnDef.meta && column.columnDef.meta.right)
  const columnLayout = (column: Column<TData, unknown>) => {
    const anchor = column === rightStart ? "ml-auto" : undefined
    return column.columnDef.meta && column.columnDef.meta.flex
      ? { className: cn("flex-1", anchor), style: { minWidth: column.getSize() } }
      : { className: cn("shrink-0", anchor), style: { width: column.getSize() } }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        ref={containerRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={(event) => loadMoreOnBottomReached(event.currentTarget)}
        className="focus-visible:border-ring focus-visible:ring-ring/50 relative min-h-0 flex-1 overflow-auto rounded-md border outline-none focus-visible:ring-3 [&_[data-slot=table-container]]:overflow-visible"
      >
        {/* Grid/flex display strips the implicit table semantics, so every structural role is restated explicitly (upstream's example skips this). */}
        <Table
          role="table"
          aria-rowcount={(typeof total === "number" ? total : rows.length) + 1}
          className="grid min-w-max"
        >
          <TableHeader role="rowgroup" className="bg-background sticky top-0 z-10 grid">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} role="row" aria-rowindex={1} className="flex w-full">
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    role="columnheader"
                    className={cn(
                      "flex items-center overflow-hidden",
                      columnLayout(header.column).className,
                      debugColumnClass(index),
                    )}
                    style={columnLayout(header.column).style}
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
          {!isLoading && rows.length > 0 && (
            <TableBody
              role="rowgroup"
              className="relative grid"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                return (
                  <TableRow
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    data-state={row.getIsSelected() && "selected"}
                    role="row"
                    aria-rowindex={virtualRow.index + 2}
                    className="absolute flex w-full"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <TableCell
                        key={cell.id}
                        role="cell"
                        className={cn(
                          "flex items-center overflow-hidden",
                          columnLayout(cell.column).className,
                          debugColumnClass(index),
                        )}
                        style={columnLayout(cell.column).style}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          )}
        </Table>
        {isLoading && (
          <div className="flex h-96 items-center justify-center">
            <Spinner />
          </div>
        )}
        {!isLoading &&
          rows.length === 0 &&
          (empty ? (
            empty
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No results</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ))}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-2">
            <Spinner />
          </div>
        )}
        {isError && rows.length > 0 && (
          <div className="text-destructive flex items-center justify-center gap-2 py-2 text-sm">
            Something went wrong
            {onRetry && (
              <Button variant="outline" onClick={() => onRetry()}>
                Retry
              </Button>
            )}
          </div>
        )}
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
