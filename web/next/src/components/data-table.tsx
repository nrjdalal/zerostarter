"use client"
"use no memo"

import {
  RiAddCircleLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCheckLine,
  RiCloseLine,
  RiEqualizerLine,
  RiExpandUpDownLine,
  type RemixiconComponentType,
} from "@remixicon/react"
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import {
  flexRender,
  useTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type ReactTable as TableInstance,
  type Updater,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "cn"
import { createParser, parseAsArrayOf, parseAsString, useQueryStates } from "nuqs"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { features, type Features } from "@/lib/data-table-features"
import { applyColumnManager, growingColumnIds, type ColumnConfig } from "@/lib/data-table-layout"

// The whole data-table family as one module (the sidebar.tsx pattern: one file, many exports). Everything reading a table or column instance lives behind the module-level "use no memo": TanStack Table mutates one stable instance during render, and compiler-memoized consumers would freeze one render behind.
// The layout math it composes (the column config contract, the font-metric widths, the slack rule) is pure and lives in @/lib/data-table-layout, and the registered features every table type is generic over live in @/lib/data-table-features; both are re-exported here so a table still has one import site.
export { applyColumnManager, features, type ColumnConfig, type Features }

// ---------------------------------------------------------------------------
// URL state: q, sort, and one array param per filter id. No page state; tables scroll infinitely and a queryKey change resets the list.

// SortingState in the URL as "column.asc" or "column.desc". Tables sort by one column (enableMultiSort: false) and server fetchers read sorting[0], so a hand-written multi-sort URL clamps to its first entry instead of marking two columns aria-sort while only one reaches the server.
const parseAsSorting = createParser<SortingState>({
  parse(value) {
    const sorting: SortingState = []
    for (const part of value.split(",")) {
      const [id, direction] = part.split(".")
      if (id && (direction === "asc" || direction === "desc")) {
        sorting.push({ desc: direction === "desc", id })
      }
    }
    return sorting.length ? [sorting[0]] : null
  },
  serialize(value) {
    return value.map((entry) => `${entry.id}.${entry.desc ? "desc" : "asc"}`).join(",")
  },
  eq(a, b) {
    return (
      a.length === b.length &&
      a.every((entry, index) => entry.id === b[index].id && entry.desc === b[index].desc)
    )
  },
})

const filterParser = parseAsArrayOf(parseAsString).withDefault([])

// Module-scope so an omitted defaultSorting keeps a stable identity; a fresh [] per render would churn the sorting slice and re-fire every state-slice effect downstream.
const EMPTY_SORTING: SortingState = []

// Parser identities must be stable across renders (nuqs caches parsed values per parser); building these inline in the hook would defeat the cache and leave useSyncExternalStore reading one update behind.
const baseParsers = {
  q: parseAsString.withDefault(""),
  sort: parseAsSorting.withDefault([]),
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater
}

// URL-synced table state shaped for useTable: spread the returned state into `state` and the handlers into the matching onChange options. Filter ids share the query-string namespace, so keep them clear of q/sort.
export function useDataTableState(
  filterIds: string[] = [],
  defaultSorting: SortingState = EMPTY_SORTING,
  sortableIds?: Set<string>,
) {
  const filterKey = filterIds.join(",")
  const filterParsers = React.useMemo(() => {
    const parsers: Record<string, typeof filterParser> = {}
    for (const id of filterKey ? filterKey.split(",") : []) parsers[id] = filterParser
    return parsers
  }, [filterKey])

  const [base, setBase] = useQueryStates(baseParsers)
  const [filters, setFilters] = useQueryStates(filterParsers)

  // A URL can name any column id, so drop the ones this table does not have before they become state: an unknown id would otherwise sort nothing, show no aria-sort, and still send its direction to the server. With nothing left the default applies as real table state, so the header chevron and aria-sort show it while the URL stays clean. Updaters resolve against this same value, so a functional updater is handed what the table actually rendered rather than an empty URL slice.
  const urlSorting = React.useMemo(
    () => (sortableIds ? base.sort.filter((entry) => sortableIds.has(entry.id)) : base.sort),
    [base.sort, sortableIds],
  )
  const sorting = urlSorting.length ? urlSorting : defaultSorting
  const globalFilter = base.q
  const columnFilters: ColumnFiltersState = React.useMemo(
    () =>
      Object.entries(filters)
        .filter(([, value]) => value.length > 0)
        .map(([id, value]) => ({ id, value })),
    [filters],
  )

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    setBase({ sort: resolveUpdater(updater, sorting) })
  }
  // Widened to undefined: table.resetGlobalFilter() passes initialState.globalFilter, which is undefined here.
  const onGlobalFilterChange = (updater: Updater<string | undefined>) => {
    const next = resolveUpdater<string | undefined>(updater, globalFilter)
    setBase({ q: next ? next : null })
  }
  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    const next = resolveUpdater(updater, columnFilters)
    const patch: Record<string, string[] | null> = {}
    for (const id of Object.keys(filterParsers)) {
      const entry = next.find((filter) => filter.id === id)
      patch[id] =
        entry && Array.isArray(entry.value) && entry.value.length ? (entry.value as string[]) : null
    }
    setFilters(patch)
  }

  return {
    columnFilters,
    globalFilter,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onSortingChange,
    sorting,
  }
}

// ---------------------------------------------------------------------------
// Server-driven wiring: URL state + infinite query + the manual-mode table instance.

export type DataTablePageInput = {
  filters: Record<string, string[]>
  page: number
  perPage: number
  search: string
  sorting: SortingState
}

export type DataTablePage<TRow> = {
  rows: TRow[]
  hasNextPage: boolean
  page: number
  total: number
}

// The select column, so a second table cannot ship a third variant of it. label names the row for a screen reader, which is the part that had already drifted.
export function selectColumn<TData extends RowData>(
  label: (row: TData) => string,
): ColumnDef<Features, TData, unknown> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected()}
        // v9's getIsSomePageRowsSelected is true when every row is selected, not only when some are, so it cannot express the third state on its own; without the second half the header box reads indeterminate at a full selection.
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${label(row.original)}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableHiding: false,
    enableSorting: false,
  }
}

// The generic server-driven table wiring. A page brings only what a generic hook cannot know (its columns, its fetcher, its filter ids, its column config) and spreads tableProps into DataTable. Client-side tables skip this and use useDataTableState directly.
export function useDataTable<TRow extends RowData>({
  batchSize = 25,
  columnConfig,
  columns,
  defaultSorting = EMPTY_SORTING,
  enableRowSelection = false,
  fetchPage,
  filterIds = [],
  getRowId,
  queryKey,
}: {
  batchSize?: number
  columnConfig?: Record<string, ColumnConfig>
  columns: ColumnDef<Features, TRow, unknown>[]
  defaultSorting?: SortingState
  enableRowSelection?: boolean
  fetchPage: (input: DataTablePageInput) => Promise<DataTablePage<TRow>>
  filterIds?: string[]
  getRowId?: (row: TRow) => string
  queryKey: string
}) {
  const managedColumns = React.useMemo(
    () => (columnConfig ? applyColumnManager(columns, columnConfig) : columns),
    [columnConfig, columns],
  )
  const sortableIds = React.useMemo(
    () =>
      new Set(
        managedColumns
          // enableSorting: false columns are excluded, or a URL naming one would become real state that no header can show or clear
          .filter((column) => column.enableSorting !== false)
          .map((column) =>
            column.id
              ? column.id
              : "accessorKey" in column
                ? String(column.accessorKey)
                : undefined,
          )
          .filter((id): id is string => id !== undefined),
      ),
    [managedColumns],
  )
  const {
    columnFilters,
    globalFilter,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onSortingChange,
    sorting,
  } = useDataTableState(filterIds, defaultSorting, sortableIds)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Defer the search term so fast typing batches requests instead of firing one per keystroke.
  const search = React.useDeferredValue(globalFilter)
  const filters = React.useMemo(() => {
    const record: Record<string, string[]> = {}
    for (const filter of columnFilters) {
      if (Array.isArray(filter.value) && filter.value.length) {
        record[filter.id] = filter.value as string[]
      }
    }
    return record
  }, [columnFilters])

  // queryFn stays ahead of getNextPageParam: TS infers the page type in declaration order.
  const query = useInfiniteQuery({
    queryKey: [queryKey, search, sorting, filters],
    queryFn: ({ pageParam }) =>
      fetchPage({
        filters,
        page: pageParam,
        perPage: batchSize,
        search,
        sorting,
      }),
    initialPageParam: 1,
    // The server says whether another page exists, so nothing here has to infer it from how many rows have accumulated against a total that may have moved.
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.page + 1 : undefined),
    placeholderData: keepPreviousData,
  })

  // Stable identity so DataTable's load-more callback and effect do not re-arm on every render.
  const fetchNextPage = query.fetchNextPage
  const onLoadMore = React.useCallback(() => {
    fetchNextPage()
  }, [fetchNextPage])

  const rows = React.useMemo(
    () => (query.data ? query.data.pages.flatMap((page) => page.rows) : []),
    [query.data],
  )
  const total = query.data ? query.data.pages[query.data.pages.length - 1].total : undefined

  // Selected ids reference rows of the current result set; a new search, sort, or filter would leave invisible selections behind, so reset.
  React.useEffect(() => {
    setRowSelection({})
  }, [filters, search, sorting])

  const table = useTable({
    columns: managedColumns,
    data: rows,
    state: { columnFilters, globalFilter, rowSelection, sorting },
    // Sizes are Tailwind spacing units; tanstack's default minSize of 20 is meant for pixels and would clamp small units, so drop the floor.
    defaultColumn: { minSize: 0 },
    // Single-column sorting only: fetchPage sends one sort to the server, so shift-click multi-sort would silently drop the extra columns.
    enableMultiSort: false,
    enableRowSelection,
    features,
    getRowId,
    manualFiltering: true,
    manualSorting: true,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange,
  })

  return {
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    // The filtered model, so what the selection bar counts and what an action touches cannot drift apart on a client-filtered table.
    selected: table.getFilteredSelectedRowModel().rows.map((row) => row.original),
    table,
    tableProps: {
      hasMore: query.hasNextPage,
      errorMessage: query.error ? query.error.message : undefined,
      isError: query.isError,
      isLoading: query.isPending,
      isLoadingMore: query.isFetchingNextPage,
      onLoadMore,
      onRetry: query.refetch,
      table,
      total,
    },
  }
}

// ---------------------------------------------------------------------------
// The region.

// Estimated data-row height for the virtualizer's scrollbar math; rows self-measure after render.
const ROW_ESTIMATE_PX = 45

// Renders a table instance the page owns as a virtualized infinite-scroll region, following TanStack Table's virtualized-infinite-scrolling example: semantic table tags flipped to grid/flex so absolutely positioned virtual rows work, a sticky header, onLoadMore fired within 500px of the bottom, a spinner while loading, and an Empty fallback. The wrapper is the scroll container, focusable and named so keyboard users can reach the overflow; the inner shadcn container is flattened via its data-slot.
export function DataTable<TData extends RowData>({
  "aria-label": ariaLabel,
  empty,
  errorMessage,
  hasMore = false,
  isError = false,
  isLoading = false,
  isLoadingMore = false,
  onLoadMore,
  onRetry,
  selectionActions,
  table,
  total,
}: {
  "aria-label": string
  empty?: React.ReactNode
  errorMessage?: string
  hasMore?: boolean
  isError?: boolean
  isLoading?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  onRetry?: () => void
  // What can be done to the selected rows. Rendered in a bar that floats in over the bottom of the table while anything is selected, next to the rows it acts on rather than up in the toolbar with the filters.
  selectionActions?: React.ReactNode
  table: TableInstance<Features, TData>
  total?: number
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  const rows = table.getRowModel().rows
  const selectable = Boolean(table.options.enableRowSelection)

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

  // Fetch the next batch once the user scrolls within 500px of the bottom; also checked after every batch so a not-yet-full region keeps loading. isError parks the loop after a failed batch, or the effect would re-fire the failing request forever; recovery goes through the visible Retry.
  const loadMoreOnBottomReached = React.useCallback(
    (container: HTMLDivElement | null) => {
      if (!container || !onLoadMore || !hasMore || isError || isLoading || isLoadingMore) return
      const { clientHeight, scrollHeight, scrollTop } = container
      if (scrollHeight - scrollTop - clientHeight < 500) onLoadMore()
    },
    [hasMore, isError, isLoading, isLoadingMore, onLoadMore],
  )
  React.useEffect(() => {
    loadMoreOnBottomReached(containerRef.current)
  }, [loadMoreOnBottomReached, rows.length])

  // Back to the top whenever sorting, search, or filters reshape the list; these state slices keep stable identities between changes, so they work as deps directly. The virtualizer instance is stable and deliberately not a dep.
  const { columnFilters, globalFilter, sorting } = table.state
  const filtering = Boolean(globalFilter) || columnFilters.length > 0
  React.useEffect(() => {
    if (rowVirtualizer.getVirtualItems().length) rowVirtualizer.scrollToIndex(0)
  }, [columnFilters, globalFilter, sorting])

  // Slack ownership, computed over the visible columns in order (see growingColumnIds).
  const growing = growingColumnIds(
    table.getVisibleLeafColumns().map((column) => ({
      auto: column.columnDef.meta && column.columnDef.meta.auto,
      flex: column.columnDef.meta && column.columnDef.meta.flex,
      id: column.id,
    })),
  )
  const columnLayout = (column: Column<Features, TData, unknown>) => {
    const meta = column.columnDef.meta
    // Centered columns drop the horizontal padding: the shadcn cell strips pr when it holds a checkbox, which would skew a padded center.
    const align =
      meta && meta.align === "right"
        ? "justify-end"
        : meta && meta.align === "center"
          ? "justify-center px-0"
          : undefined
    // Sizes are Tailwind spacing units; computing through the --spacing token keeps table widths on the same scale as every other width in the app.
    const width = `calc(var(--spacing) * ${column.getSize()})`
    return growing.has(column.id)
      ? { className: cn("flex-1", align), style: { minWidth: width } }
      : { className: cn("shrink-0", align), style: { width } }
  }

  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-2">
      <div
        ref={containerRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={(event) => loadMoreOnBottomReached(event.currentTarget)}
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 relative min-h-0 flex-1 overflow-auto rounded-md border outline-none focus-visible:ring-3 [&_[data-slot=table-container]]:overflow-visible",
          // Room to scroll the last rows clear of the floating bar, which otherwise sits over them for as long as anything is selected.
          selectionActions && selectedCount > 0 && "pb-14",
        )}
      >
        {/* Grid/flex display strips the implicit table semantics, so every structural role is restated explicitly, and the virtualized DOM undercounts rows, so aria-rowcount reports the full set. */}
        <Table
          role="table"
          aria-rowcount={(typeof total === "number" ? total : rows.length) + 1}
          className="grid min-w-max"
        >
          <TableHeader role="rowgroup" className="bg-background sticky top-0 z-10 grid">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} role="row" aria-rowindex={1} className="flex w-full">
                {headerGroup.headers.map((header) => {
                  const layout = columnLayout(header.column)
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      role="columnheader"
                      aria-sort={
                        header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : undefined
                      }
                      className={cn("flex items-center overflow-hidden", layout.className)}
                      style={layout.style}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
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
                    {row.getVisibleCells().map((cell) => {
                      const layout = columnLayout(cell.column)
                      return (
                        <TableCell
                          key={cell.id}
                          role="cell"
                          className={cn("flex items-center overflow-hidden", layout.className)}
                          style={layout.style}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
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
          // Error outranks both the consumer's empty and the default: a failed first load has no rows, and rendering "No results" for it would report an outage as an empty table with no way back.
          (isError ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Something went wrong</EmptyTitle>
                {errorMessage && <EmptyDescription>{errorMessage}</EmptyDescription>}
              </EmptyHeader>
              {onRetry && (
                <EmptyContent>
                  <Button variant="outline" onClick={() => onRetry()}>
                    Retry
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : empty && !filtering ? (
            // The consumer's empty says what the table is for when it holds nothing. A search or filter that matches nothing is a different fact, and saying "no rules yet" over a filtered result states the opposite of the truth.
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
      {selectionActions && selectedCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-20 flex justify-center">
          <div
            // A group, not a toolbar: role="toolbar" promises roving tabindex and arrow-key navigation, and a handful of buttons that tab normally is the honest shape.
            role="group"
            aria-label={`Actions for ${selectedCount} selected`}
            className="bg-popover animate-in fade-in slide-in-from-bottom-2 pointer-events-auto flex items-center gap-1 rounded-md border p-1 shadow-md"
          >
            {selectionActions}
            <Button variant="ghost" onClick={() => table.resetRowSelection()}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {(selectable || typeof total === "number") && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <div>
            {selectable
              ? `${selectedCount} of ${table.getFilteredRowModel().rows.length} row(s) selected`
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

// ---------------------------------------------------------------------------
// Column header: a plain title with a bare sort icon.

// Sortable column header: the title stays text so it aligns with cell content natively; the only control is the icon, a native button for keyboard and screen readers with a focus ring as its only chrome, toggling asc and desc (hiding lives in the view options). A right-aligned header mirrors the icon to the left so the title stays flush with the cell text. Falls back to a plain label for non-sortable columns.
export function DataTableColumnHeader<TData extends RowData, TValue>({
  className,
  column,
}: {
  className?: string
  column: Column<Features, TData, TValue>
}) {
  // meta.label is the one source for this column's header text, its measured width, and its view-options entry; a separate title prop would silently desync the width from what the header actually renders.
  const title =
    column.columnDef.meta && column.columnDef.meta.label ? column.columnDef.meta.label : column.id
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>
  }

  const align = column.columnDef.meta && column.columnDef.meta.align
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

// ---------------------------------------------------------------------------
// Cell text: overflow behavior from the column config.

// Text cells render through this so column widths never move with content. The mode comes from the column config's wrap flag through column meta: false truncates to one line with an ellipsis and reveals the full value in a tooltip only when actually cut (measured on hover); true flows onto multiple lines and lets the self-measured virtual row grow. Truncation is CSS-only, so the full value stays in the DOM and assistive tech reads it whether or not the tooltip ever opens; the tooltip is a sighted-pointer convenience, which is why the trigger takes no tab stop (one per text cell would bury the table's real controls).
export function DataTableCellText<TData extends RowData, TValue>({
  children,
  className,
  column,
}: {
  children: React.ReactNode
  className?: string
  column?: Column<Features, TData, TValue>
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = React.useState(false)

  const wrap = Boolean(column && column.columnDef.meta && column.columnDef.meta.wrap)
  if (wrap) {
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
          <span ref={ref} onMouseEnter={measure} className={cn("min-w-0 truncate", className)} />
        }
      >
        {children}
      </TooltipTrigger>
      {truncated && <TooltipContent>{children}</TooltipContent>}
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Toolbar.

// Search box wired to the table's global filter, a children slot for faceted filters, a reset button once anything filters, and on the right the view-options toggle followed by an actions slot.
export function DataTableToolbar<TData extends RowData>({
  actions,
  children,
  searchMaxLength,
  searchPlaceholder = "Search...",
  table,
}: {
  // Table-level actions (adding a row, exporting): they end the toolbar, past the view options, away from the filters that narrow what is already there.
  actions?: React.ReactNode
  children?: React.ReactNode
  searchMaxLength?: number
  searchPlaceholder?: string
  table: TableInstance<Features, TData>
}) {
  const globalFilter = table.state.globalFilter
  const search = typeof globalFilter === "string" ? globalFilter : ""
  const isFiltered = search !== "" || table.state.columnFilters.length > 0
  // The placeholder doubles as the accessible name, minus its trailing ellipsis: a screen reader would otherwise announce "Search users dot dot dot".
  const searchLabel = searchPlaceholder.replace(/[.\u2026]+$/, "")

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center gap-2">
        {/* searchMaxLength belongs to whatever backs the table: pass the endpoint's own q cap so a long paste cannot flip it into the error state. */}
        <Input
          type="search"
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          maxLength={searchMaxLength}
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
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        {actions}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// View options.

// Column visibility toggle for every hideable accessor column, labeled from columnDef.meta.label when set.
export function DataTableViewOptions<TData extends RowData>({
  table,
}: {
  table: TableInstance<Features, TData>
}) {
  const columns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())

  if (columns.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="hidden lg:flex" />}>
        <RiEqualizerLine />
        View
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          {columns.map((column) => {
            const meta = column.columnDef.meta
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {meta && meta.label ? meta.label : column.id}
              </DropdownMenuCheckboxItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------------------------------------------------------------------------
// Faceted filter.

// Multi-select filter over a column's values; renders nothing when the column is absent so call sites can pass table.getColumn(...) directly.
export function DataTableFacetedFilter<TData extends RowData, TValue>({
  column,
  options,
  title,
}: {
  column: Column<Features, TData, TValue> | undefined
  options: { icon?: RemixiconComponentType; label: string; value: string }[]
  title: string
}) {
  if (!column) return null

  // Returns an empty map when the faceted row models are not wired (server-driven tables), so counts simply stay hidden.
  const facets = column.getFacetedUniqueValues()
  const filterValue = column.getFilterValue()
  const selectedValues = new Set(Array.isArray(filterValue) ? (filterValue as string[]) : [])

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="border-dashed" />}>
        <RiAddCircleLine />
        {title}
        {selectedValues.size > 0 && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="secondary" className="lg:hidden">
              {selectedValues.size}
            </Badge>
            <div className="hidden gap-1 lg:flex">
              {selectedValues.size > 2 ? (
                <Badge variant="secondary">{selectedValues.size} selected</Badge>
              ) : (
                options
                  .filter((option) => selectedValues.has(option.value))
                  .map((option) => (
                    <Badge key={option.value} variant="secondary">
                      {option.label}
                    </Badge>
                  ))
              )}
            </div>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-0">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                const count = facets.get(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      // Read the live filter rather than mutating the set this render closed over, so rapid clicks do not depend on that set being shared.
                      const current = column.getFilterValue()
                      const next = new Set(Array.isArray(current) ? (current as string[]) : [])
                      if (next.has(option.value)) next.delete(option.value)
                      else next.add(option.value)
                      column.setFilterValue(next.size ? Array.from(next) : undefined)
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border border-input",
                        isSelected && "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {isSelected && <RiCheckLine className="size-3.5" />}
                    </span>
                    {option.icon && <option.icon className="text-muted-foreground" />}
                    <span>{option.label}</span>
                    {typeof count === "number" && count > 0 && (
                      <span className="text-muted-foreground ml-auto font-mono text-xs">
                        {count}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column.setFilterValue(undefined)}
                    className="justify-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
