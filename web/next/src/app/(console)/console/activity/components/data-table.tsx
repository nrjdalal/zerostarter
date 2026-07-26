"use client"
"use no memo"

import { ACTIVITY_ACTIONS } from "@packages/config/console"

import {
  activityColumnConfig,
  activityColumns,
  type ActivityEvent,
} from "@/app/(console)/console/activity/components/data-columns"
import {
  DataTable,
  DataTableFacetedFilter,
  DataTableToolbar,
  useDataTable,
  type DataTablePage,
  type DataTablePageInput,
} from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { actionOptions, activityJson } from "@/lib/activity"
import { apiClient, unwrap } from "@/lib/api/client"
import { copyToClipboard } from "@/lib/clipboard"
import { acceptedFacet } from "@/lib/data-table-layout"

// Newest first, and the only order the log is read in.
const DEFAULT_SORT = { desc: true, id: "createdAt" }
const DEFAULT_SORTING = [DEFAULT_SORT]
const Q_MAX = 254

async function fetchActivity({
  filters,
  page,
  perPage,
  search,
  sorting,
}: DataTablePageInput): Promise<DataTablePage<ActivityEvent>> {
  const actions = acceptedFacet(filters.action, ACTIVITY_ACTIONS)
  const sort = sorting.length ? sorting[0] : DEFAULT_SORT
  const { data, error } = await unwrap(
    apiClient.v1.admin.activity.$get({
      query: {
        action: actions.length ? actions.join(",") : undefined,
        dir: sort.desc ? "desc" : "asc",
        page: `${page}`,
        perPage: `${perPage}`,
        q: search ? search.slice(0, Q_MAX) : undefined,
      },
    }),
  )
  if (error) throw new Error(error.message)
  return { rows: data.events, hasNextPage: data.hasNextPage, page: data.page, total: data.total }
}

// Server-driven activity list: search and the action filter resolve on the API, batches stream in on scroll.
export function ActivityDataTable() {
  const { selected, table, tableProps } = useDataTable({
    columnConfig: activityColumnConfig,
    columns: activityColumns,
    defaultSorting: DEFAULT_SORTING,
    enableRowSelection: true,
    fetchPage: fetchActivity,
    filterIds: ["action"],
    getRowId: (row) => row.id,
    queryKey: "console-activity",
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTableToolbar
        table={table}
        searchMaxLength={Q_MAX}
        searchPlaceholder="Search activity..."
      >
        <DataTableFacetedFilter
          column={table.getColumn("action")}
          options={actionOptions}
          title="Action"
        />
      </DataTableToolbar>
      <DataTable
        {...tableProps}
        aria-label="Activity"
        selectionActions={
          <Button
            variant="outline"
            onClick={() => {
              // Oldest first, whatever order the table is sorted in: a log read anywhere else reads forwards.
              const events = [...selected].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
              copyToClipboard(
                activityJson(events),
                events.length === 1 ? "Event copied" : `${events.length} events copied`,
              )
              table.resetRowSelection()
            }}
          >
            Copy
          </Button>
        }
        empty={
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nothing yet</EmptyTitle>
              <EmptyDescription>
                Changing a role, banning an account or editing the allowlist records a line here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
