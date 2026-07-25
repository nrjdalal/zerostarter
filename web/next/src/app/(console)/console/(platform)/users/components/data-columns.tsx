"use client"
"use no memo"

import { RiMoreLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { InferResponseType } from "hono/client"
import { toast } from "sonner"

import { DataTableCellText } from "@/components/data-table/cell-text"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { COLUMN_SIZES } from "@/components/data-table/column-sizes"
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

export const usersColumns: ColumnDef<ConsoleUser>[] = [
  {
    id: "select",
    size: COLUMN_SIZES.console.users.select,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all"
        checked={table.getIsAllPageRowsSelected() || table.getIsSomePageRowsSelected()}
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
    size: COLUMN_SIZES.console.users.name,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <DataTableCellText className="font-medium">{row.original.name}</DataTableCellText>
    ),
    meta: { label: "Name" },
  },
  {
    accessorKey: "email",
    size: COLUMN_SIZES.console.users.email,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <DataTableCellText className="text-muted-foreground">{row.original.email}</DataTableCellText>
    ),
    meta: { flex: true, label: "Email" },
  },
  {
    accessorKey: "role",
    size: COLUMN_SIZES.console.users.role,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    cell: ({ row }) => (
      <DataTableCellText className="capitalize">{row.original.role}</DataTableCellText>
    ),
    meta: { label: "Role" },
  },
  {
    id: "status",
    accessorKey: "banned",
    size: COLUMN_SIZES.console.users.status,
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <DataTableCellText>{row.original.banned ? "Banned" : "Active"}</DataTableCellText>
    ),
    meta: { label: "Status" },
  },
  {
    accessorKey: "createdAt",
    size: COLUMN_SIZES.console.users.createdAt,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
    cell: ({ row }) => (
      <DataTableCellText>
        {new Date(row.original.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
      </DataTableCellText>
    ),
    meta: { label: "Joined" },
  },
  {
    id: "actions",
    size: COLUMN_SIZES.console.users.actions,
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <span className="sr-only">Open menu</span>
          <RiMoreLine />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(row.original.id)
                  toast.success("User ID copied")
                } catch {
                  toast.error("Copy failed")
                }
              }}
            >
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(row.original.email)
                  toast.success("Email copied")
                } catch {
                  toast.error("Copy failed")
                }
              }}
            >
              Copy email
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableHiding: false,
    enableSorting: false,
  },
]
