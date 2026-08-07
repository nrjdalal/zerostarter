"use client"
"use no memo"

import { RiMoreLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { InferResponseType } from "hono/client"

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
import type { Features } from "@/lib/data-table-features"

// Row shape inferred from GET /api/v1/admin/allowlist, so the endpoint cannot drift from these columns.
export type AllowlistRuleRow = InferResponseType<
  typeof apiClient.v1.admin.allowlist.$get
>["data"]["rules"][number]

// This table's layout, colocated with its columns and written in column order. Rule floors wide and grows, since a domain and a full address differ a lot in length.
export const allowlistColumnConfig: Record<string, ColumnConfig> = {
  select: { width: 12 },
  rule: { extra: 48, flex: true },
  actor: { align: "right", extra: 24 },
  kind: { align: "right", extra: 8 },
  createdAt: { align: "right", extra: 15 },
  actions: { align: "center", width: 12 },
}

export const allowlistColumns = (
  onDelete: (rule: AllowlistRuleRow) => void,
): ColumnDef<Features, AllowlistRuleRow, unknown>[] => [
  selectColumn((row) => row.value),
  {
    id: "rule",
    accessorKey: "value",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="font-medium">
        {row.original.value}
      </DataTableCellText>
    ),
    meta: { label: "Rule" },
  },
  {
    accessorKey: "actor",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="text-muted-foreground">
        {row.original.actor ?? "Seeded"}
      </DataTableCellText>
    ),
    meta: { label: "Added by" },
  },
  {
    accessorKey: "kind",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="capitalize">
        {row.original.kind}
      </DataTableCellText>
    ),
    meta: { label: "Kind" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column}>
        {new Date(row.original.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
      </DataTableCellText>
    ),
    meta: { label: "Added" },
  },
  {
    id: "actions",
    // Defence in depth, as on the users table: the page is admin-gated, so this branch does not fire today.
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
              <DropdownMenuItem onClick={() => copyToClipboard(row.original.value, "Rule copied")}>
                Copy rule
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
                Remove
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
