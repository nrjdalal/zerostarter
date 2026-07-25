"use client"

import { RiMoreLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

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

// Row shape served by GET /api/v1/admin/users (createdAt is an ISO string over the wire).
export type ConsoleUser = {
  createdAt: string
  email: string
  emailVerified: boolean
  id: string
  image: string | null
  name: string
  role: string
}

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
      <div className="flex items-center gap-2">
        <Avatar size="sm">
          {row.original.image && <AvatarImage src={row.original.image} alt="" />}
          <AvatarFallback>{row.original.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
    meta: { label: "Name" },
  },
  {
    accessorKey: "email",
    size: 320,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
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
                await navigator.clipboard.writeText(row.original.id)
                toast.success("User ID copied")
              }}
            >
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await navigator.clipboard.writeText(row.original.email)
                toast.success("Email copied")
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
