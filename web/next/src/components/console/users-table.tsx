"use client"
"use no memo"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getCoreRowModel, useReactTable, type RowSelectionState } from "@tanstack/react-table"
import * as React from "react"

import { usersColumns } from "@/components/console/users-columns"
import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { DataTablePagination } from "@/components/data-table/pagination"
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

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
]

const SORTS = ["createdAt", "email", "name", "role"] as const
type UsersSort = (typeof SORTS)[number]

// Server-driven users table for the console: pagination, sorting, search, and the role filter all resolve on the API, with the table in manual mode and its state in the URL.
export function ConsoleUsersTable() {
  const {
    columnFilters,
    globalFilter,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onPaginationChange,
    onSortingChange,
    pagination,
    sorting,
  } = useDataTableState(["role"])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Defer the search term so fast typing batches requests instead of firing one per keystroke.
  const search = React.useDeferredValue(globalFilter)
  const roleFilter = columnFilters.find((filter) => filter.id === "role")
  const roles = roleFilter && Array.isArray(roleFilter.value) ? (roleFilter.value as string[]) : []
  const sort = sorting.length ? sorting[0] : { desc: true, id: "createdAt" }
  const sortId = SORTS.includes(sort.id as UsersSort) ? (sort.id as UsersSort) : "createdAt"

  const query = useQuery({
    placeholderData: keepPreviousData,
    queryKey: [
      "console-users",
      pagination.pageIndex,
      pagination.pageSize,
      search,
      sortId,
      sort.desc,
      roles.join(","),
    ],
    queryFn: async () => {
      const { data, error } = await unwrap(
        apiClient.v1.admin.users.$get({
          query: {
            dir: sort.desc ? "desc" : "asc",
            page: `${pagination.pageIndex + 1}`,
            perPage: `${pagination.pageSize}`,
            q: search ? search : undefined,
            role: roles.length ? roles.join(",") : undefined,
            sort: sortId,
          },
        }),
      )
      if (error) throw new Error(error.message)
      return data
    },
  })

  const table = useReactTable({
    columns: usersColumns,
    data: query.data ? query.data.users : [],
    state: { columnFilters, globalFilter, pagination, rowSelection, sorting },
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onPaginationChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange,
    rowCount: query.data ? query.data.total : 0,
  })

  return (
    <div className="flex flex-col gap-4">
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
        isLoading={query.isPending}
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
      <DataTablePagination table={table} />
    </div>
  )
}
