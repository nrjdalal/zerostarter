"use client"
"use no memo"

import { CONSOLE_ROLES, grantableRoles, refuseBan, type ConsoleRole } from "@packages/auth/access"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { InferRequestType } from "hono/client"
import * as React from "react"

import {
  usersColumnConfig,
  usersColumns,
  type ConsoleUser,
} from "@/app/(console)/console/(access)/users/components/data-columns"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { useConsoleRole } from "@/components/console/role"
import {
  DataTable,
  DataTableFacetedFilter,
  DataTableToolbar,
  useDataTable,
  type DataTablePage,
  type DataTablePageInput,
} from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { runBatched, toastBulk } from "@/lib/api/bulk"
import { apiClient, unwrap } from "@/lib/api/client"
import { acceptedFacet, facetOptions, resolveSort } from "@/lib/data-table-layout"

// Who has been around lately, rather than who signed up lately: the console is usually opened to find someone active. The sessions group-by behind it is paid on every load either way, since the column shows on every row; what this costs is ordering by that aggregate instead of an indexed column on user. Left unindexed until there are row counts worth reading.
const DEFAULT_SORT = { desc: true, id: "lastActive" }
const DEFAULT_SORTING = [DEFAULT_SORT]

// Derived from the ladder rather than restated, so a new rung shows up in the facet instead of quietly missing from it.
const ROLE_OPTIONS = facetOptions(CONSOLE_ROLES)
// Mirrors the endpoint's q cap: the toolbar input caps typing and pasting, but a hand-written URL would otherwise 400 the table into an error state whose Retry replays it.
const Q_MAX = 254

// Column ids mapped to the endpoint's sort whitelist (status sorts by the backing banned flag); satisfies makes any server-side rename a compile error here.
type UsersSort = NonNullable<
  InferRequestType<typeof apiClient.v1.admin.users.$get>["query"]["sort"]
>
const SORT_FIELDS = {
  createdAt: "createdAt",
  email: "email",
  lastActive: "lastActive",
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
  const sortId = resolveSort(SORT_FIELDS, sort.id, "lastActive")
  // Drop values the API's enum would reject, so a hand-written ?role=bogus degrades to an unfiltered list (which is what the facet UI shows, since it cannot select an unknown value) instead of 400ing the table into its error state.
  const roles = acceptedFacet(filters.role, CONSOLE_ROLES)
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
  return { rows: data.users, hasNextPage: data.hasNextPage, page: data.page, total: data.total }
}

// Server-driven users table: sorting, search, and the role filter resolve on the API, batches stream in on scroll, and the table state lives in the URL.
export function UsersDataTable() {
  const { canWrite, role: viewerRole, viewerId } = useConsoleRole()
  const queryClient = useQueryClient()
  const [pendingRole, setPendingRole] = React.useState<ConsoleRole | null>(null)
  // Rows and intent travel together, so the row menu and the selection bar open the same confirm and run the same mutation.
  const [pendingStatus, setPendingStatus] = React.useState<{
    banned: boolean
    fromSelection: boolean
    users: ConsoleUser[]
  } | null>(null)
  const columns = React.useMemo(
    () =>
      usersColumns((users, banned) => setPendingStatus({ banned, fromSelection: false, users })),
    [],
  )
  const { selected, table, tableProps } = useDataTable({
    columnConfig: usersColumnConfig,
    columns,
    defaultSorting: DEFAULT_SORTING,
    enableRowSelection: true,
    fetchPage: fetchUsers,
    filterIds: ["role"],
    getRowId: (row) => row.id,
    queryKey: "console-users",
  })

  // Asked per row, like Ban: selecting only your own account or people you do not outrank offers no Set role at all, rather than a menu whose every pick is refused.
  const changeable = selected.filter(
    (row) =>
      grantableRoles({
        actorRole: viewerRole,
        isSelf: row.id === viewerId,
        targetRole: row.role,
      }).length > 0,
  )
  const grantable = [
    ...new Set(
      changeable.flatMap((row) =>
        grantableRoles({
          actorRole: viewerRole,
          isSelf: row.id === viewerId,
          targetRole: row.role,
        }),
      ),
    ),
  ]
  // Ban asks the same guard the API asks, per row, so an admin sees no Ban on an owner or on their own account rather than a button whose only outcome is a refusal.
  const bannable = selected.filter(
    (row) =>
      refuseBan({ actorRole: viewerRole, isSelf: row.id === viewerId, targetRole: row.role }) ===
      null,
  )

  // The guard is per target, so a batch is partly refusable by design: one call for the set, then a count of what changed and what the API turned down. A role change is confirmed here though a single-row one is not, because a mis-picked role in a menu lands on every selected account at once.
  const setRole = useMutation({
    mutationFn: async (role: ConsoleRole) =>
      runBatched(
        changeable.map((row) => row.id),
        (ids) => unwrap(apiClient.v1.admin.users.role.$patch({ json: { ids, role } })),
      ),
    onSuccess: (outcome, role) => {
      setPendingRole(null)
      table.resetRowSelection()
      // Named when it was one account, counted when it was a batch: "1 changed" reads like a report about someone you were looking at by name.
      toastBulk(
        outcome,
        "changed",
        changeable[0] ? `Changed ${changeable[0].email} to ${role}` : undefined,
      )
      queryClient.invalidateQueries({ queryKey: ["console-users"] })
    },
  })

  // The last intent, kept so the labels hold while the dialog animates closed: pendingStatus goes null on close, and reading it directly would flip Ban to Unban for a frame on the way out.
  const lastStatus = React.useRef(pendingStatus)
  if (pendingStatus) lastStatus.current = pendingStatus
  const shownStatus = pendingStatus ?? lastStatus.current

  const setStatus = useMutation({
    mutationFn: async ({
      banned,
      users,
    }: {
      banned: boolean
      fromSelection: boolean
      users: ConsoleUser[]
    }) =>
      runBatched(
        users.map((row) => row.id),
        (ids) => unwrap(apiClient.v1.admin.users.status.$patch({ json: { banned, ids } })),
      ),
    onSuccess: (outcome, { banned, fromSelection, users }) => {
      setPendingStatus(null)
      // Only what the selection bar started clears the selection: a row-menu ban has nothing to do with the rows someone has staged for a batch, and throwing that away is silent work lost.
      if (fromSelection) table.resetRowSelection()
      toastBulk(
        outcome,
        banned ? "banned" : "unbanned",
        users[0] ? `${banned ? "Banned" : "Unbanned"} ${users[0].email}` : undefined,
      )
      queryClient.invalidateQueries({ queryKey: ["console-users"] })
    },
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
      <DataTable
        {...tableProps}
        aria-label="Users"
        selectionActions={
          canWrite ? (
            <>
              {bannable.some((row) => !row.banned) && (
                <Button
                  variant="destructive"
                  onClick={() =>
                    setPendingStatus({
                      banned: true,
                      fromSelection: true,
                      users: bannable.filter((row) => !row.banned),
                    })
                  }
                >
                  Ban
                </Button>
              )}
              {bannable.some((row) => row.banned) && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setPendingStatus({
                      banned: false,
                      fromSelection: true,
                      users: bannable.filter((row) => row.banned),
                    })
                  }
                >
                  Unban
                </Button>
              )}
              {changeable.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" />}>
                    Set role
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    {grantable.map((role) => (
                      <DropdownMenuItem
                        key={role}
                        className="capitalize"
                        onClick={() => setPendingRole(role)}
                      >
                        {role}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          ) : undefined
        }
      />
      <ConfirmDialog
        action={shownStatus && shownStatus.banned ? "Ban" : "Unban"}
        variant={shownStatus && shownStatus.banned ? "destructive" : "default"}
        open={pendingStatus !== null}
        pending={setStatus.isPending}
        onOpenChange={(open) => !open && setPendingStatus(null)}
        onConfirm={() => pendingStatus && setStatus.mutate(pendingStatus)}
        title={
          <>
            {shownStatus && shownStatus.banned ? "Ban" : "Unban"}{" "}
            {shownStatus && shownStatus.users.length === 1
              ? shownStatus.users[0].email
              : `${shownStatus ? shownStatus.users.length : 0} people`}
            ?
          </>
        }
        description={
          <>
            {shownStatus && shownStatus.banned
              ? "Signed out everywhere, and cannot sign back in until you unban them."
              : "They can sign in again. Their role is unchanged, so this restores exactly the access they had."}
            {shownStatus && shownStatus.users.length > 1
              ? " Anyone you do not outrank is left as they are."
              : null}
          </>
        }
      />
      <ConfirmDialog
        action="Set role"
        open={pendingRole !== null}
        pending={setRole.isPending}
        onOpenChange={(open) => !open && setPendingRole(null)}
        onConfirm={() => pendingRole && setRole.mutate(pendingRole)}
        title={
          <>
            Set {changeable.length} {changeable.length === 1 ? "person" : "people"} to{" "}
            <span className="capitalize">{pendingRole}</span>?
          </>
        }
        description="Anyone the console refuses to change, such as you or an account you do not outrank, keeps their current role."
      />
    </div>
  )
}
