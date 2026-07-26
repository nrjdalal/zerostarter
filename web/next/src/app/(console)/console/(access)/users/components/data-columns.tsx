"use client"
"use no memo"

import { RiMoreLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { InferResponseType } from "hono/client"
import { toast } from "sonner"

import { UserRoleSelect } from "@/app/(console)/console/(access)/users/components/role-select"
import { useConsoleRole } from "@/components/console/role"
import {
  DataTableCellText,
  DataTableColumnHeader,
  type ColumnConfig,
} from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { apiClient } from "@/lib/api/client"

// Row shape inferred from GET /api/v1/admin/users, so the endpoint cannot drift from these columns.
export type ConsoleUser = InferResponseType<
  typeof apiClient.v1.admin.users.$get
>["data"]["users"][number]

async function copyText(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(message)
  } catch {
    toast.error("Copy failed")
  }
}

// This table's layout, colocated with its columns and written in column order. Widthless columns size from their meta.label (the string the header renders); email floors at label + 48 units and grows; select stays left so its box reads as the gap when it inherits growth.
export const usersColumnConfig: Record<string, ColumnConfig> = {
  select: { width: 12 },
  // label + 9rem
  name: { extra: 36 },
  email: { extra: 48, flex: true },
  status: { align: "right" },
  role: { align: "right", extra: 18 },
  createdAt: { align: "right", extra: 15 },
  actions: { align: "center", width: 12 },
}

export const usersColumns: ColumnDef<ConsoleUser>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableHiding: false,
    enableSorting: false,
  },
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
    cell: ({ row }) => <UserRoleSelect role={row.original.role} userId={row.original.id} />,
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
    id: "actions",
    // Defence in depth: this page is admin-gated, so canWrite is always true here today. Kept so the table stays correct if a lower rung is ever let in, since a control that exists only to refuse invites the attempt.
    cell: ({ row }) => {
      const { canWrite } = useConsoleRole()
      if (!canWrite) return null
      return (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <span className="sr-only">Open menu</span>
            <RiMoreLine />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => copyText(row.original.id, "User ID copied")}>
                Copy user ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyText(row.original.email, "Email copied")}>
                Copy email
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableHiding: false,
    enableSorting: false,
  },
]
