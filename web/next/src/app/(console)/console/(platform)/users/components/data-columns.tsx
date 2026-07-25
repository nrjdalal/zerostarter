"use client"
"use no memo"

import { RiMoreLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { InferResponseType } from "hono/client"
import { toast } from "sonner"

import { DataTableCellText } from "@/components/data-table/cell-text"
import { DataTableColumnHeader } from "@/components/data-table/column-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
    size: 48,
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
    size: 240,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <Avatar size="sm">
          {row.original.image && <AvatarImage src={row.original.image} alt="" />}
          <AvatarFallback>{row.original.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <DataTableCellText className="font-medium">{row.original.name}</DataTableCellText>
      </div>
    ),
    meta: { label: "Name" },
  },
  {
    accessorKey: "email",
    size: 320,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <DataTableCellText className="text-muted-foreground">{row.original.email}</DataTableCellText>
    ),
    meta: { flex: true, label: "Email" },
  },
  {
    accessorKey: "role",
    size: 110,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    cell: ({ row }) => (
      <Badge variant={row.original.role === "admin" ? "default" : "outline"} className="capitalize">
        {row.original.role}
      </Badge>
    ),
    meta: { label: "Role" },
  },
  {
    accessorKey: "createdAt",
    size: 150,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }),
    meta: { label: "Joined" },
  },
  {
    id: "actions",
    size: 56,
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
