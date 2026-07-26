"use client"
"use no memo"

import { RiMoreLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { InferResponseType } from "hono/client"

import {
  DataTableCellText,
  DataTableColumnHeader,
  selectColumn,
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

export type WaitlistSignup = InferResponseType<
  typeof apiClient.v1.admin.waitlist.$get
>["data"]["signups"][number]

export const waitlistColumnConfig: Record<string, ColumnConfig> = {
  select: { width: 12 },
  email: { extra: 40, flex: true },
  createdAt: { align: "right", extra: 15 },
  actions: { align: "center", width: 12 },
}

export const waitlistColumns = (
  onRemove: (signup: WaitlistSignup) => void,
): ColumnDef<WaitlistSignup>[] => [
  selectColumn((row: WaitlistSignup) => row.email),
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="font-medium">
        {row.original.email}
      </DataTableCellText>
    ),
    meta: { label: "Email" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    // Rows only ever render on the client, so the reader's own locale and clock are safe to read here.
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="text-muted-foreground">
        {relativeTime(row.original.createdAt, new Date())}
      </DataTableCellText>
    ),
    meta: { label: "Joined" },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Open menu">
              <RiMoreLine />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => copyToClipboard(row.original.email, "Email copied")}>
              Copy email
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onRemove(row.original)}>
              Remove
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableSorting: false,
    meta: { label: "Actions" },
  },
]
