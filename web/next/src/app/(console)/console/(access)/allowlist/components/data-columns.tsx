"use client"
"use no memo"

import { RiDeleteBinLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { InferResponseType } from "hono/client"

import { useConsoleRole } from "@/components/console/role"
import {
  DataTableCellText,
  DataTableColumnHeader,
  type ColumnConfig,
} from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"

// Row shape inferred from GET /api/v1/admin/allowlist, so the endpoint cannot drift from these columns.
export type AllowlistRuleRow = InferResponseType<
  typeof apiClient.v1.admin.allowlist.$get
>["data"]["rules"][number]

// This table's layout, colocated with its columns and written in column order. Rule floors wide and grows, since a domain and a full address differ a lot in length.
export const allowlistColumnConfig: Record<string, ColumnConfig> = {
  value: { extra: 48, flex: true },
  createdByName: { align: "right", extra: 24 },
  kind: { align: "right", extra: 8 },
  createdAt: { align: "right", extra: 15 },
  actions: { align: "center", width: 12 },
}

// Says who a rule lets in, in the same words the add dialog previews.
export function describeRule(rule: { kind: string; value: string }) {
  return rule.kind === "domain"
    ? `Anyone at ${rule.value.slice(1)} gets console access`
    : `${rule.value} gets console access`
}

export const allowlistColumns = (
  onDelete: (rule: AllowlistRuleRow) => void,
): ColumnDef<AllowlistRuleRow>[] => [
  {
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
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${row.original.value}`}
          onClick={() => onDelete(row.original)}
        >
          <RiDeleteBinLine />
        </Button>
      )
    },
    enableHiding: false,
    enableSorting: false,
  },
]
