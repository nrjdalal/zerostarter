"use client"
"use no memo"

import { CONSOLE_ROLES, type ConsoleRole } from "@packages/auth/access"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { InferRequestType } from "hono/client"
import * as React from "react"
import { toast } from "sonner"

import {
  usersColumnConfig,
  usersColumns,
  type ConsoleUser,
} from "@/app/(console)/console/(access)/users/components/data-columns"
import { grantableRoles, useConsoleRole } from "@/components/console/role"
import {
  DataTable,
  DataTableFacetedFilter,
  DataTableToolbar,
  useDataTable,
  type DataTablePage,
  type DataTablePageInput,
} from "@/components/data-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { bulkSucceeded, describeBulk, runBulk } from "@/lib/api/bulk"
import { apiClient, unwrap } from "@/lib/api/client"

const DEFAULT_SORT = { desc: true, id: "createdAt" }
const DEFAULT_SORTING = [DEFAULT_SORT]

// Derived from the ladder rather than restated, so a new rung shows up in the facet instead of quietly missing from it.
const ROLE_OPTIONS = CONSOLE_ROLES.map((value) => ({
  label: `${value[0].toUpperCase()}${value.slice(1)}`,
  value,
}))
const ROLE_VALUES = new Set<string>(CONSOLE_ROLES)
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
  const { table, tableProps } = useDataTable({
    columnConfig: usersColumnConfig,
    columns,
    defaultSorting: DEFAULT_SORTING,
    enableRowSelection: true,
    fetchPage: fetchUsers,
    filterIds: ["role"],
    getRowId: (row) => row.id,
    queryKey: "console-users",
  })

  const selected = table.getSelectedRowModel().rows.map((row) => row.original)
  // What this viewer could grant at all, asked against the lowest rung: an admin sees member and user, an owner sees everything. Which of the selected rows accept it is still the API's call.
  const grantable = grantableRoles({
    targetId: "",
    targetRole: "user",
    viewer: { id: viewerId, role: viewerRole },
  })

  // The guard is per target, so a batch is partly refusable by design: one call per user, then a count of what changed and what the API turned down. A role change is confirmed here though a single-row one is not, because a mis-picked role in a menu lands on every selected account at once.
  const setRole = useMutation({
    mutationFn: async (role: ConsoleRole) =>
      runBulk(selected, async (row) => {
        const { error } = await unwrap(
          apiClient.v1.admin.users[":id"].role.$patch({ json: { role }, param: { id: row.id } }),
        )
        return error
      }),
    onSuccess: (outcome) => {
      setPendingRole(null)
      table.resetRowSelection()
      if (!outcome.done && outcome.firstMessage) toast.error(outcome.firstMessage)
      else if (bulkSucceeded(outcome)) toast.success(describeBulk(outcome, "changed"))
      else toast.warning(describeBulk(outcome, "changed"))
      queryClient.invalidateQueries({ queryKey: ["console-users"] })
    },
  })

  const setStatus = useMutation({
    mutationFn: async ({
      banned,
      users,
    }: {
      banned: boolean
      fromSelection: boolean
      users: ConsoleUser[]
    }) =>
      runBulk(users, async (row) => {
        const { error } = await unwrap(
          apiClient.v1.admin.users[":id"].status.$patch({
            json: { banned },
            param: { id: row.id },
          }),
        )
        return error
      }),
    onSuccess: (outcome, { banned, fromSelection }) => {
      setPendingStatus(null)
      // Only what the selection bar started clears the selection: a row-menu ban has nothing to do with the rows someone has staged for a batch, and throwing that away is silent work lost.
      if (fromSelection) table.resetRowSelection()
      const verb = banned ? "banned" : "unbanned"
      // Nothing got through, so the reason is the whole story and reads better as the error it is.
      if (!outcome.done && outcome.firstMessage) toast.error(outcome.firstMessage)
      else if (bulkSucceeded(outcome)) toast.success(describeBulk(outcome, verb))
      else toast.warning(describeBulk(outcome, verb))
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
              {selected.some((row) => !row.banned) && (
                <Button
                  variant="destructive"
                  onClick={() =>
                    setPendingStatus({
                      banned: true,
                      fromSelection: true,
                      users: selected.filter((row) => !row.banned),
                    })
                  }
                >
                  Ban
                </Button>
              )}
              {selected.some((row) => row.banned) && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setPendingStatus({
                      banned: false,
                      fromSelection: true,
                      users: selected.filter((row) => row.banned),
                    })
                  }
                >
                  Unban
                </Button>
              )}
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
            </>
          ) : undefined
        }
      />
      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus && pendingStatus.banned ? "Ban" : "Unban"}{" "}
              {pendingStatus && pendingStatus.users.length === 1
                ? pendingStatus.users[0].email
                : `${pendingStatus ? pendingStatus.users.length : 0} people`}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus && pendingStatus.banned
                ? "Signed out everywhere, and cannot sign back in until you unban them."
                : "They can sign in again. Their role is unchanged, so this restores exactly the access they had."}
              {pendingStatus && pendingStatus.users.length > 1
                ? " Anyone you do not outrank is left as they are."
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setStatus.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={pendingStatus && pendingStatus.banned ? "destructive" : "default"}
              disabled={setStatus.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (pendingStatus) setStatus.mutate(pendingStatus)
              }}
            >
              {pendingStatus && pendingStatus.banned ? "Ban" : "Unban"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={pendingRole !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRole(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Set {selected.length} {selected.length === 1 ? "person" : "people"} to{" "}
              <span className="capitalize">{pendingRole}</span>?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anyone the console refuses to change, such as you or an account you do not outrank,
              keeps their current role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setRole.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={setRole.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (pendingRole) setRole.mutate(pendingRole)
              }}
            >
              Set role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
