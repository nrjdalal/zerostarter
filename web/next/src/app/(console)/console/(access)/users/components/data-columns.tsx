"use client"
"use no memo"

import { refuseBan } from "@packages/auth/access"
import { RiMoreLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { InferResponseType } from "hono/client"

import { UserRoleSelect } from "@/app/(console)/console/(access)/users/components/role-select"
import { useConsoleRole } from "@/components/console/role"
import {
  DataTableCellText,
  selectColumn,
  DataTableColumnHeader,
  type ColumnConfig,
} from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api/client"
import { copyToClipboard } from "@/lib/clipboard"
import { relativeTime } from "@/lib/time"

// Row shape inferred from GET /api/v1/admin/users, so the endpoint cannot drift from these columns.
export type ConsoleUser = InferResponseType<
  typeof apiClient.v1.admin.users.$get
>["data"]["users"][number]

// This table's layout, colocated with its columns and written in column order. Widthless columns size from their meta.label (the string the header renders); email floors at label + 48 units and grows; select stays left so its box reads as the gap when it inherits growth.
export const usersColumnConfig: Record<string, ColumnConfig> = {
  select: { width: 12 },
  // label + 9rem
  name: { extra: 36 },
  email: { extra: 48, flex: true },
  status: { align: "right" },
  role: { align: "right", extra: 18 },
  createdAt: { align: "right", extra: 15 },
  lastActive: { align: "right", extra: 15 },
  actions: { align: "center", width: 12 },
}

export const usersColumns = (
  onSetStatus: (users: ConsoleUser[], banned: boolean) => void,
): ColumnDef<ConsoleUser>[] => [
  selectColumn((row) => row.email),
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="font-medium">
        {row.original.name}
      </DataTableCellText>
    ),
    meta: { label: "Name" },
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="text-muted-foreground">
        {row.original.email}
      </DataTableCellText>
    ),
    meta: { label: "Email" },
  },
  {
    id: "status",
    accessorKey: "banned",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column}>
        {row.original.banned ? "Banned" : "Active"}
      </DataTableCellText>
    ),
    meta: { label: "Status" },
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    // The platform role, not an organization membership role: this one decides console access.
    cell: ({ column, row }) => (
      <UserRoleSelect
        column={column}
        email={row.original.email}
        role={row.original.role}
        userId={row.original.id}
      />
    ),
    meta: { label: "Role" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    // Undefined locale means the reader's own format. Safe because rows only ever render on the client (the query has no server prefetch, so SSR emits the spinner and no cells); prefetching rows into the server render would make this a hydration mismatch and force a pinned locale.
    cell: ({ column, row }) => (
      <DataTableCellText column={column}>
        {new Date(row.original.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
      </DataTableCellText>
    ),
    meta: { label: "Joined" },
  },
  {
    accessorKey: "lastActive",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    // Never signed in, or signed out, or banned: all three leave no session, and a dash says so rather than inventing a time.
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="text-muted-foreground">
        {row.original.lastActive ? relativeTime(row.original.lastActive, new Date()) : "-"}
      </DataTableCellText>
    ),
    // "Last active" rather than "Active", because Status renders the word Active in the cell two columns left and one table should not say it twice meaning two different things.
    meta: { label: "Last active" },
  },
  {
    id: "actions",
    // Defence in depth: this page is admin-gated, so canWrite is always true here today. Kept so the table stays correct if a lower rung is ever let in, since a control that exists only to refuse invites the attempt.
    cell: ({ row }) => {
      const { canWrite, role: viewerRole, viewerId } = useConsoleRole()
      if (!canWrite) return null
      // The same guard the API asks: an owner's row, and your own, offer no ban rather than one that can only be refused.
      const canBan =
        refuseBan({
          actorRole: viewerRole,
          isSelf: row.original.id === viewerId,
          targetRole: row.original.role,
        }) === null
      return (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <span className="sr-only">Open menu</span>
            <RiMoreLine />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => copyToClipboard(row.original.id, "User ID copied")}>
                Copy user ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyToClipboard(row.original.email, "Email copied")}>
                Copy email
              </DropdownMenuItem>
              {canBan &&
                (row.original.banned ? (
                  <DropdownMenuItem onClick={() => onSetStatus([row.original], false)}>
                    Unban
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onSetStatus([row.original], true)}
                  >
                    Ban
                  </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableHiding: false,
    enableSorting: false,
  },
]
