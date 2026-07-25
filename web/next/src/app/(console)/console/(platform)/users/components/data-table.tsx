"use client"
"use no memo"

import type { InferRequestType } from "hono/client"

import {
  usersColumns,
  type ConsoleUser,
} from "@/app/(console)/console/(platform)/users/components/data-columns"
import { COLUMN_MANAGER } from "@/components/data-table/column-manager"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableFacetedFilter } from "@/components/data-table/faceted-filter"
import { DataTableToolbar } from "@/components/data-table/toolbar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { useDataTable, type DataTablePage, type DataTablePageInput } from "@/hooks/use-data-table"
import { apiClient, unwrap } from "@/lib/api/client"

const DEFAULT_SORTING = [{ desc: true, id: "createdAt" }]

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
]

// Column ids mapped to the endpoint's sort whitelist (status sorts by the backing banned flag); satisfies makes any server-side rename a compile error here.
type UsersSort = NonNullable<
  InferRequestType<typeof apiClient.v1.admin.users.$get>["query"]["sort"]
>
const SORT_FIELDS = {
  createdAt: "createdAt",
  email: "email",
  name: "name",
  role: "role",
  status: "banned",
} as const satisfies Record<string, UsersSort>

async function fetchUsers({
  filters,
  page,
  perPage,
  search,
  sorting,
}: DataTablePageInput): Promise<DataTablePage<ConsoleUser>> {
  const sort = sorting.length ? sorting[0] : { desc: true, id: "createdAt" }
  const sortId =
    sort.id in SORT_FIELDS ? SORT_FIELDS[sort.id as keyof typeof SORT_FIELDS] : "createdAt"
  const roles = filters.role ? filters.role : []
  const { data, error } = await unwrap(
    apiClient.v1.admin.users.$get({
      query: {
        dir: sort.desc ? "desc" : "asc",
        page: `${page}`,
        perPage: `${perPage}`,
        q: search ? search : undefined,
        role: roles.length ? roles.join(",") : undefined,
        sort: sortId,
      },
    }),
  )
  if (error) throw new Error(error.message)
  return { rows: data.users, total: data.total }
}

// Server-driven users table: sorting, search, and the role filter resolve on the API, batches stream in on scroll, and the table state lives in the URL.
export function UsersDataTable() {
  const { error, isError, refetch, table, tableProps } = useDataTable({
    columns: usersColumns,
    defaultSorting: DEFAULT_SORTING,
    enableRowSelection: true,
    fetchPage: fetchUsers,
    filterIds: ["role"],
    getRowId: (row) => row.id,
    manager: COLUMN_MANAGER.console.users,
    queryKey: "console-users",
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
        {...tableProps}
        aria-label="Users"
        empty={
          isError ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Failed to load users</EmptyTitle>
                <EmptyDescription>{error ? error.message : "Request failed"}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={() => refetch()}>
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
