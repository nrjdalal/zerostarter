"use client"
"use no memo"

import { RiMoreLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { InferResponseType } from "hono/client"
import { toast } from "sonner"

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

// This table's layout, colocated with its columns and written in column order. Widthless columns size from their header title; email floors at header + 60 units and grows; select stays left so its box reads as the gap when it inherits growth.
export const usersColumnConfig: Record<string, ColumnConfig> = {
  select: { width: 12 },
  // header title + 12rem
  name: { extra: 48 },
  email: { extra: 60, flex: true },
  role: { align: "center" },
  status: { align: "center" },
  createdAt: { align: "right", extra: 24 },
  actions: { align: "center", width: 12 },
}

export const usersColumns: ColumnDef<ConsoleUser>[] = [
  {
    id: "select",
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="font-medium">
        {row.original.name}
      </DataTableCellText>
    ),
    meta: { label: "Name" },
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="text-muted-foreground">
        {row.original.email}
      </DataTableCellText>
    ),
    meta: { label: "Email" },
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="capitalize">
        {row.original.role}
      </DataTableCellText>
    ),
    meta: { label: "Role" },
  },
  {
    id: "status",
    accessorKey: "banned",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column}>
        {row.original.banned ? "Banned" : "Active"}
      </DataTableCellText>
    ),
    meta: { label: "Status" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column}>
        {new Date(row.original.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
      </DataTableCellText>
    ),
    meta: { label: "Joined" },
  },
  {
    id: "actions",
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
