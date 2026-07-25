"use client"
"use no memo"

import { measureNaturalWidth, prepareWithSegments } from "@chenglou/pretext"
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
  getCoreRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table as TableInstance,
  type Updater,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { createParser, parseAsArrayOf, parseAsString, useQueryStates } from "nuqs"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
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
import { cn } from "@/lib/utils"

// The whole data-table family as one module (the sidebar.tsx pattern: one file, many exports). Everything reading a table or column instance lives behind the module-level "use no memo": TanStack Table v8 mutates one stable instance during render, and compiler-memoized consumers would freeze one render behind.

// Column meta carried from the column config: labels for the view-options menu, plus the layout and overflow flags the renderer reads.
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "center" | "left" | "right"
    auto?: boolean
    flex?: boolean
    label?: string
    wrap?: boolean
  }
}

// ---------------------------------------------------------------------------
// Column config: per-table layout data, colocated with each table's columns file.

export type ColumnConfig = {
  align?: "center" | "left" | "right"
  extra?: number
  flex?: boolean
  width?: number
  wrap?: boolean
}

// A widthless column sizes as header title + an allowance in spacing units, snapped up to the 3-unit grid: config.extra when set, else this default (10 = 2.5rem: the cell inset plus the sort button's gap, icon, and inset). SSR has no canvas, so callers fall back to AUTO_WIDTH_FALLBACK until mounted.
const AUTO_WIDTH_FALLBACK = 24
const AUTO_WIDTH_EXTRA_UNITS = 10
const measuredUnits = new Map<string, number>()

// Header title width at the table's header font (text-sm font-medium), via pretext's canvas-backed metrics: pure arithmetic, no DOM layout, cached per label and allowance; px converts to spacing units at the default scale (1 unit = 4px).
function autoWidthUnits(label: string, extraUnits: number): number | undefined {
  if (typeof document === "undefined") return undefined
  const key = `${extraUnits}:${label}`
  const cached = measuredUnits.get(key)
  if (cached !== undefined) return cached
  const family = getComputedStyle(document.body).fontFamily
  const titlePx = measureNaturalWidth(prepareWithSegments(label, `500 14px ${family}`))
  const units = Math.ceil((titlePx / 4 + extraUnits) / 3) * 3
  measuredUnits.set(key, units)
  return units
}

// Folds a table's column config into its defs by column id (id, else accessorKey), so useReactTable sees size plus the align/flex/wrap meta; columns without an entry pass through untouched. A widthless config measures its header label once measure flips true (after mount, keeping server and hydration renders identical). Flex capability reaches back from a flex column to every column before it. useDataTable applies this via its columnConfig option; client-side tables call it directly.
export function applyColumnManager<TData extends RowData>(
  columns: ColumnDef<TData>[],
  columnConfig: Record<string, ColumnConfig>,
  measure = true,
): ColumnDef<TData>[] {
  const configFor = (column: ColumnDef<TData>) => {
    const id = column.id
      ? column.id
      : "accessorKey" in column
        ? String(column.accessorKey)
        : undefined
    return { config: id ? columnConfig[id] : undefined, id }
  }
  let lastFlex = -1
  columns.forEach((column, index) => {
    const { config } = configFor(column)
    if (config && config.flex) lastFlex = index
  })
  return columns.map((column, index) => {
    const { config, id } = configFor(column)
    if (!config || !id) return column
    const label = column.meta && column.meta.label ? column.meta.label : id
    const measured = measure
      ? autoWidthUnits(label, config.extra !== undefined ? config.extra : AUTO_WIDTH_EXTRA_UNITS)
      : undefined
    const width =
      config.width !== undefined
        ? config.width
        : measured !== undefined
          ? measured
          : AUTO_WIDTH_FALLBACK
    return {
      ...column,
      size: width,
      meta: {
        ...column.meta,
        align: config.align ? config.align : "left",
        // auto marks widthless columns: a table with no flex column spreads them instead of trailing dead space
        auto: config.width === undefined,
        flex: index <= lastFlex,
        wrap: config.wrap ? true : false,
      },
    }
  })
}

// ---------------------------------------------------------------------------
// URL state: q, sort, and one array param per filter id. No page state; tables scroll infinitely and a queryKey change resets the list.

// SortingState in the URL as "column.asc" or "column.desc", comma-separated for multi-sort.
const parseAsSorting = createParser<SortingState>({
  parse(value) {
    const sorting: SortingState = []
    for (const part of value.split(",")) {
      const [id, direction] = part.split(".")
      if (id && (direction === "asc" || direction === "desc")) {
        sorting.push({ desc: direction === "desc", id })
      }
    }
    return sorting.length ? sorting : null
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

// Parser identities must be stable across renders (nuqs caches parsed values per parser); building these inline in the hook would defeat the cache and leave useSyncExternalStore reading one update behind.
const baseParsers = {
  q: parseAsString.withDefault(""),
  sort: parseAsSorting.withDefault([]),
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater
}

// URL-synced table state shaped for useReactTable: spread the returned state into `state` and the handlers into the matching onChange options. Filter ids share the query-string namespace, so keep them clear of q/sort.
export function useDataTableState(filterIds: string[] = []) {
  const filterKey = filterIds.join(",")
  const filterParsers = React.useMemo(() => {
    const parsers: Record<string, typeof filterParser> = {}
    for (const id of filterKey ? filterKey.split(",") : []) parsers[id] = filterParser
    return parsers
  }, [filterKey])

  const [base, setBase] = useQueryStates(baseParsers)
  const [filters, setFilters] = useQueryStates(filterParsers)

  const sorting = base.sort
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
  total: number
}

// The generic server-driven table wiring. A page brings only what a generic hook cannot know (its columns, its fetcher, its filter ids, its column config) and spreads tableProps into DataTable. Client-side tables skip this and use useDataTableState directly.
export function useDataTable<TRow>({
  batchSize = 25,
  columnConfig,
  columns,
  defaultSorting = [],
  enableRowSelection = false,
  fetchPage,
  filterIds = [],
  getRowId,
  queryKey,
}: {
  batchSize?: number
  columnConfig?: Record<string, ColumnConfig>
  columns: ColumnDef<TRow>[]
  defaultSorting?: SortingState
  enableRowSelection?: boolean
  fetchPage: (input: DataTablePageInput) => Promise<DataTablePage<TRow>>
  filterIds?: string[]
  getRowId?: (row: TRow) => string
  queryKey: string
}) {
  const {
    columnFilters,
    globalFilter,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onSortingChange,
    sorting,
  } = useDataTableState(filterIds)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // With no sort in the URL the default applies as real state, so the header chevron and aria-sort show it while the URL stays clean.
  const effectiveSorting = sorting.length ? sorting : defaultSorting

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
    queryKey: [queryKey, search, effectiveSorting, filters],
    queryFn: ({ pageParam }) =>
      fetchPage({
        filters,
        page: pageParam,
        perPage: batchSize,
        search,
        sorting: effectiveSorting,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // A zero-row page ends the list unconditionally: without this, a stale total (rows deleted mid-scroll) would keep hasNextPage true and the load-more effect firing forever.
      if (lastPage.rows.length === 0) return undefined
      const loaded = allPages.reduce((count, page) => count + page.rows.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
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

  // Auto widths measure the header label with canvas metrics, so hold measurement until after mount: server and hydration renders share the fallback, then one settle applies the measured widths.
  const [measureReady, setMeasureReady] = React.useState(false)
  React.useEffect(() => {
    setMeasureReady(true)
  }, [])
  const managedColumns = React.useMemo(
    () => (columnConfig ? applyColumnManager(columns, columnConfig, measureReady) : columns),
    [columnConfig, columns, measureReady],
  )

  const table = useReactTable({
    columns: managedColumns,
    data: rows,
    state: { columnFilters, globalFilter, rowSelection, sorting: effectiveSorting },
    // Sizes are Tailwind spacing units; tanstack's default minSize of 20 is meant for pixels and would clamp small units, so drop the floor.
    defaultColumn: { minSize: 0 },
    // Single-column sorting only: fetchPage sends one sort to the server, so shift-click multi-sort would silently drop the extra columns.
    enableMultiSort: false,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
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
    table,
    tableProps: {
      hasMore: query.hasNextPage,
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
export function DataTable<TData>({
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
}: {
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
}) {
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

  // Slack ownership: of the visible flex-capable columns (capability reaches back from a flex column), only the last one grows; the rest hold their width, so hiding the growing column hands growth backward and two growing neighbors cannot fight. A table with no flex column spreads its widthless columns instead. Fixed columns hold their width, so narrow viewports overflow into the region's horizontal scroll instead of crushing cells.
  const visibleColumns = table.getVisibleLeafColumns()
  const anyCapableVisible = visibleColumns.some(
    (column) => column.columnDef.meta && column.columnDef.meta.flex,
  )
  const flexAt = visibleColumns.map((column, index) => {
    if (!anyCapableVisible) return Boolean(column.columnDef.meta && column.columnDef.meta.auto)
    const flex = Boolean(column.columnDef.meta && column.columnDef.meta.flex)
    const next = visibleColumns[index + 1]
    const nextFlex = Boolean(next && next.columnDef.meta && next.columnDef.meta.flex)
    return flex && !nextFlex
  })
  const columnLayout = (column: Column<TData, unknown>, index: number) => {
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
    return flexAt[index]
      ? { className: cn("flex-1", align), style: { minWidth: width } }
      : { className: cn("shrink-0", align), style: { width } }
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
        {/* Grid/flex display strips the implicit table semantics, so every structural role is restated explicitly, and the virtualized DOM undercounts rows, so aria-rowcount reports the full set. */}
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
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                    className={cn(
                      "flex items-center overflow-hidden",
                      columnLayout(header.column, index).className,
                    )}
                    style={columnLayout(header.column, index).style}
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
                          columnLayout(cell.column, index).className,
                        )}
                        style={columnLayout(cell.column, index).style}
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

// ---------------------------------------------------------------------------
// Column header: a plain title with a bare sort icon.

// Sortable column header: the title stays text so it aligns with cell content natively; the only control is the icon, a native button for keyboard and screen readers with a focus ring as its only chrome, toggling asc and desc (hiding lives in the view options). A right-aligned header mirrors the icon to the left so the title stays flush with the cell text. Falls back to a plain label for non-sortable columns.
export function DataTableColumnHeader<TData, TValue>({
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

// Text cells render through this so column widths never move with content. The mode comes from the column config's wrap flag through column meta: false truncates to one line with an ellipsis and reveals the full value in a tooltip only when actually cut (measured on hover/focus); true flows onto multiple lines and lets the self-measured virtual row grow.
export function DataTableCellText<TData, TValue>({
  children,
  className,
  column,
}: {
  children: React.ReactNode
  className?: string
  column?: Column<TData, TValue>
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

// ---------------------------------------------------------------------------
// Toolbar.

// Search box wired to the table's global filter, a children slot for faceted filters, a reset button once anything filters, and the view-options toggle.
export function DataTableToolbar<TData>({
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

// ---------------------------------------------------------------------------
// View options.

// Column visibility toggle for every hideable accessor column, labeled from columnDef.meta.label when set.
export function DataTableViewOptions<TData>({ table }: { table: TableInstance<TData> }) {
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
export function DataTableFacetedFilter<TData, TValue>({
  column,
  options,
  title,
}: {
  column: Column<TData, TValue> | undefined
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
                      if (isSelected) {
                        selectedValues.delete(option.value)
                      } else {
                        selectedValues.add(option.value)
                      }
                      const next = Array.from(selectedValues)
                      column.setFilterValue(next.length ? next : undefined)
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
