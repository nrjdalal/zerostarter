"use client"
"use no memo"

import type { InferRequestType } from "hono/client"

import {
  usersColumnConfig,
  usersColumns,
  type ConsoleUser,
} from "@/app/(console)/console/(platform)/users/components/data-columns"
import {
  DataTable,
  DataTableFacetedFilter,
  DataTableToolbar,
  useDataTable,
  type DataTablePage,
  type DataTablePageInput,
} from "@/components/data-table"
import { apiClient, unwrap } from "@/lib/api/client"

const DEFAULT_SORT = { desc: true, id: "createdAt" }
const DEFAULT_SORTING = [DEFAULT_SORT]

const ROLE_OPTIONS = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
]
const ROLE_VALUES = new Set(ROLE_OPTIONS.map((option) => option.value))
// Mirrors the endpoint's q cap: the toolbar input caps typing and pasting, but a hand-written URL would otherwise 400 the table into an error state whose Retry replays it.
const Q_MAX = 254

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
  const sort = sorting.length ? sorting[0] : DEFAULT_SORT
  // hasOwn, not `in`: the URL parser accepts any id, and `"constructor" in SORT_FIELDS` is true through the prototype chain, so `in` would send Object itself as the sort and park the table on the API's 400.
  const sortId = Object.hasOwn(SORT_FIELDS, sort.id)
    ? SORT_FIELDS[sort.id as keyof typeof SORT_FIELDS]
    : "createdAt"
  // Drop values the API's enum would reject, so a hand-written ?role=bogus degrades to an unfiltered list (which is what the facet UI shows, since it cannot select an unknown value) instead of 400ing the table into its error state.
  const roles = filters.role ? filters.role.filter((role) => ROLE_VALUES.has(role)) : []
  const { data, error } = await unwrap(
    apiClient.v1.admin.users.$get({
      query: {
        dir: sort.desc ? "desc" : "asc",
        page: `${page}`,
        perPage: `${perPage}`,
        q: search ? search.slice(0, Q_MAX) : undefined,
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
  const { table, tableProps } = useDataTable({
    columnConfig: usersColumnConfig,
    columns: usersColumns,
    defaultSorting: DEFAULT_SORTING,
    enableRowSelection: true,
    fetchPage: fetchUsers,
    filterIds: ["role"],
    getRowId: (row) => row.id,
    queryKey: "console-users",
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTableToolbar table={table} searchMaxLength={Q_MAX} searchPlaceholder="Search users...">
        <DataTableFacetedFilter
          column={table.getColumn("role")}
          options={ROLE_OPTIONS}
          title="Role"
        />
      </DataTableToolbar>
      <DataTable {...tableProps} aria-label="Users" />
    </div>
  )
}
