"use client"
"use no memo"

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"
import * as React from "react"

import { useDataTableState } from "@/hooks/use-data-table-state"

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

// The generic server-driven table wiring: URL state (useDataTableState), an infinite query batching fetchPage until total is reached, and the manual-mode table instance. A page brings only what a generic hook cannot know (its columns, its fetcher, its filter ids) and spreads tableProps into DataTable. Client-side tables skip this and use useDataTableState directly.
export function useDataTable<TRow>({
  batchSize = 25,
  columns,
  enableRowSelection = false,
  fetchPage,
  filterIds = [],
  getRowId,
  queryKey,
}: {
  batchSize?: number
  columns: ColumnDef<TRow>[]
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

  const query = useInfiniteQuery({
    queryKey: [queryKey, search, sorting, filters],
    queryFn: ({ pageParam }) =>
      fetchPage({ filters, page: pageParam, perPage: batchSize, search, sorting }),
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

  const table = useReactTable({
    columns,
    data: rows,
    state: { columnFilters, globalFilter, rowSelection, sorting },
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
