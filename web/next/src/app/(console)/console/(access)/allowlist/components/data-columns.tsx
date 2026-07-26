"use client"
"use no memo"

import type { AllowlistRule } from "@packages/auth/access"
import { RiMoreLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { InferResponseType } from "hono/client"

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
import { copyToClipboard } from "@/lib/clipboard"

// Row shape inferred from GET /api/v1/admin/allowlist, so the endpoint cannot drift from these columns.
export type AllowlistRuleRow = InferResponseType<
  typeof apiClient.v1.admin.allowlist.$get
>["data"]["rules"][number]

// This table's layout, colocated with its columns and written in column order. Rule floors wide and grows, since a domain and a full address differ a lot in length.
export const allowlistColumnConfig: Record<string, ColumnConfig> = {
  select: { width: 12 },
  rule: { extra: 48, flex: true },
  createdByName: { align: "right", extra: 24 },
  kind: { align: "right", extra: 8 },
  createdAt: { align: "right", extra: 15 },
  actions: { align: "center", width: 12 },
}

// Says who a rule lets in, in the same words the add dialog previews.
export function describeRule(rule: AllowlistRule) {
  return rule.kind === "domain"
    ? `Anyone at ${rule.value.slice(1)} gets console access`
    : `${rule.value} gets console access`
}

export const allowlistColumns = (
  onDelete: (rule: AllowlistRuleRow) => void,
): ColumnDef<AllowlistRuleRow>[] => [
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
        aria-label={`Select ${row.original.value}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableHiding: false,
    enableSorting: false,
  },
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
    accessorKey: "createdByName",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="text-muted-foreground">
        {row.original.createdByName ?? "Seeded"}
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
