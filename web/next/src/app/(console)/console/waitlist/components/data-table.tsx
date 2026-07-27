"use client"
"use no memo"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { InferRequestType } from "hono/client"
import * as React from "react"

import {
  waitlistColumnConfig,
  waitlistColumns,
  type WaitlistSignup,
} from "@/app/(console)/console/waitlist/components/data-columns"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { useConsoleRole } from "@/components/console/role"
import {
  DataTable,
  DataTableToolbar,
  useDataTable,
  type DataTablePage,
  type DataTablePageInput,
} from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { runBatched, toastBulk } from "@/lib/api/bulk"
import { apiClient, unwrap } from "@/lib/api/client"
import { copyToClipboard } from "@/lib/clipboard"
import { resolveSort } from "@/lib/data-table-layout"
import { waitlistEmails } from "@/lib/waitlist"

const DEFAULT_SORT = { desc: true, id: "createdAt" }
const DEFAULT_SORTING = [DEFAULT_SORT]

// Column ids mapped to the endpoint's sort whitelist; satisfies makes a server-side rename a compile error here.
type WaitlistSort = NonNullable<
  InferRequestType<typeof apiClient.v1.admin.waitlist.$get>["query"]["sort"]
>
const SORT_FIELDS = {
  createdAt: "createdAt",
  email: "email",
} as const satisfies Record<string, WaitlistSort>
// Mirrors the endpoint's q cap so a hand-written URL cannot 400 the table.
const Q_MAX = 254

async function fetchSignups({
  page,
  perPage,
  search,
  sorting,
}: DataTablePageInput): Promise<DataTablePage<WaitlistSignup>> {
  const sort = sorting.length ? sorting[0] : DEFAULT_SORT
  const sortId = resolveSort(SORT_FIELDS, sort.id, "createdAt")
  const { data, error } = await unwrap(
    apiClient.v1.admin.waitlist.$get({
      query: {
        dir: sort.desc ? "desc" : "asc",
        page: `${page}`,
        perPage: `${perPage}`,
        q: search ? search.slice(0, Q_MAX) : undefined,
        sort: sortId,
      },
    }),
  )
  if (error) throw new Error(error.message)
  return { rows: data.signups, hasNextPage: data.hasNextPage, page: data.page, total: data.total }
}

// Who has asked to be told. The whole page is admin and above, so canWrite is true for anyone who can see this table; the affordances still ask, because a control that exists only to refuse invites the attempt.
export function WaitlistDataTable() {
  const { canWrite } = useConsoleRole()
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = React.useState<{
    fromSelection: boolean
    signups: WaitlistSignup[]
  } | null>(null)

  const columns = React.useMemo(
    () =>
      waitlistColumns((signup) => setPendingDelete({ fromSelection: false, signups: [signup] })),
    [],
  )
  const { selected, table, tableProps } = useDataTable({
    columnConfig: waitlistColumnConfig,
    columns,
    defaultSorting: DEFAULT_SORTING,
    enableRowSelection: true,
    fetchPage: fetchSignups,
    getRowId: (row) => row.id,
    queryKey: "console-waitlist",
  })

  // One request for the selection, and the reply carries a line per signup, so one that was already gone is reported as itself rather than failing the whole removal.
  const remove = useMutation({
    mutationFn: async ({ signups }: { fromSelection: boolean; signups: WaitlistSignup[] }) =>
      runBatched(
        signups.map((signup) => signup.id),
        (ids) => unwrap(apiClient.v1.admin.waitlist.$delete({ json: { ids } })),
      ),
    onSuccess: (outcome, { fromSelection, signups }) => {
      setPendingDelete(null)
      // Only what the selection bar started clears the selection: a row-menu removal has nothing to do with the rows someone has staged for a batch.
      if (fromSelection) table.resetRowSelection()
      // signups is one row from the menu or the selection, which only renders with something in it, so there is always a first.
      toastBulk(outcome, "removed", `Removed ${signups[0].email}`)
      queryClient.invalidateQueries({ queryKey: ["console-waitlist"] })
    },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTableToolbar
        table={table}
        searchMaxLength={Q_MAX}
        searchPlaceholder="Search signups..."
      />
      <DataTable
        {...tableProps}
        aria-label="Signups"
        selectionActions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                copyToClipboard(
                  waitlistEmails(selected),
                  selected.length === 1 ? "Email copied" : `${selected.length} emails copied`,
                )
                table.resetRowSelection()
              }}
            >
              Copy
            </Button>
            {canWrite ? (
              <Button
                variant="destructive"
                onClick={() => setPendingDelete({ fromSelection: true, signups: selected })}
              >
                Remove
              </Button>
            ) : undefined}
          </>
        }
        empty={
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nobody yet</EmptyTitle>
              <EmptyDescription>
                Signups from the public waitlist form land here, newest first.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
      <ConfirmDialog
        action="Remove"
        variant="destructive"
        open={pendingDelete !== null}
        pending={remove.isPending}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
        title={
          pendingDelete && pendingDelete.signups.length === 1
            ? `Remove ${pendingDelete.signups[0].email}?`
            : `Remove ${pendingDelete ? pendingDelete.signups.length : 0} signups?`
        }
        description="The address is deleted. They can sign up again, and the removal is recorded in Activity."
      />
    </div>
  )
}
