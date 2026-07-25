"use client"
"use no memo"

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { getCoreRowModel, useReactTable, type RowSelectionState } from "@tanstack/react-table"
import * as React from "react"

import { usersColumns } from "@/components/console/users-columns"
import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { DataTable } from "@/components/data-table/table"
import { DataTableToolbar } from "@/components/data-table/toolbar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useDataTableState } from "@/hooks/use-data-table-state"
import { apiClient, unwrap } from "@/lib/api/client"

const BATCH_SIZE = 25

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
]

const SORTS = ["createdAt", "email", "name", "role"] as const
type UsersSort = (typeof SORTS)[number]

// Server-driven users table for the console: sorting, search, and the role filter resolve on the API, batches stream in on scroll via useInfiniteQuery, and the table state lives in the URL.
export function ConsoleUsersTable() {
  const {
    columnFilters,
    globalFilter,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onSortingChange,
    sorting,
  } = useDataTableState(["role"])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Defer the search term so fast typing batches requests instead of firing one per keystroke.
  const search = React.useDeferredValue(globalFilter)
  const roleFilter = columnFilters.find((filter) => filter.id === "role")
  const roles = roleFilter && Array.isArray(roleFilter.value) ? (roleFilter.value as string[]) : []
  const sort = sorting.length ? sorting[0] : { desc: true, id: "createdAt" }
  const sortId = SORTS.includes(sort.id as UsersSort) ? (sort.id as UsersSort) : "createdAt"

  // queryFn stays ahead of getNextPageParam: TS infers the page type in declaration order.
  const query = useInfiniteQuery({
    queryKey: ["console-users", search, sortId, sort.desc, roles.join(",")],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await unwrap(
        apiClient.v1.admin.users.$get({
          query: {
            dir: sort.desc ? "desc" : "asc",
            page: `${pageParam}`,
            perPage: `${BATCH_SIZE}`,
            q: search ? search : undefined,
            role: roles.length ? roles.join(",") : undefined,
            sort: sortId,
          },
        }),
      )
      if (error) throw new Error(error.message)
      return data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.users.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
    placeholderData: keepPreviousData,
  })

  const users = React.useMemo(
    () => (query.data ? query.data.pages.flatMap((page) => page.users) : []),
    [query.data],
  )
  const total = query.data ? query.data.pages[query.data.pages.length - 1].total : undefined

  const table = useReactTable({
    columns: usersColumns,
    data: users,
    state: { columnFilters, globalFilter, rowSelection, sorting },
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualFiltering: true,
    manualSorting: true,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange,
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTableToolbar table={table} searchPlaceholder="Search users...">
        <DataTableFacetedFilter
          column={table.getColumn("role")}
          options={ROLE_OPTIONS}
          title="Role"
        />
      </DataTableToolbar>
      <DataTable
        aria-label="Users"
        table={table}
        hasMore={query.hasNextPage}
        isLoading={query.isPending}
        isLoadingMore={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
        total={total}
        empty={
          query.isError ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Failed to load users</EmptyTitle>
                <EmptyDescription>{query.error.message}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => query.refetch()}>
                  Retry
                </Button>
              </EmptyContent>
            </Empty>
          ) : undefined
        }
      />
    </div>
  )
}
