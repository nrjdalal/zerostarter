"use client"

import { flexRender, type RowData, type Table as TableInstance } from "@tanstack/react-table"

import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
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
  isLoading?: boolean
  table: TableInstance<TData>
}

// Renders a table instance the page owns (useReactTable): header groups, rows, skeleton rows while loading, and an Empty fallback. The wrapper is the scroll container, focusable and named so keyboard users can reach the overflow; the inner shadcn container is flattened via its data-slot.
function DataTable<TData>({
  "aria-label": ariaLabel,
  empty,
  isLoading = false,
  table,
}: DataTableProps<TData>) {
  const columns = table.getVisibleLeafColumns()

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className="focus-visible:border-ring focus-visible:ring-ring/50 overflow-x-auto rounded-md border outline-none focus-visible:ring-3 [&_[data-slot=table-container]]:overflow-visible"
    >
      <Table>
        <TableHeader>
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
            Array.from({ length: Math.min(table.getState().pagination.pageSize, 10) }, (_, row) => (
              <TableRow key={row}>
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
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
  )
}

export { DataTable }
