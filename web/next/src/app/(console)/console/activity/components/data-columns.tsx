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
import { actionLabel, activityJson } from "@/lib/activity"
import { apiClient } from "@/lib/api/client"
import { copyToClipboard } from "@/lib/clipboard"
import { relativeTime } from "@/lib/time"

export type ActivityEvent = InferResponseType<
  typeof apiClient.v1.admin.activity.$get
>["data"]["events"][number]

export const activityColumnConfig: Record<string, ColumnConfig> = {
  select: { width: 12 },
  actor: { extra: 36 },
  action: { extra: 18 },
  summary: { extra: 48, flex: true },
  createdAt: { align: "right", extra: 15 },
  actions: { align: "center", width: 12 },
}

export const activityColumns: ColumnDef<ActivityEvent>[] = [
  selectColumn((row: ActivityEvent) => row.summary),
  {
    accessorKey: "actor",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="font-medium">
        {row.original.actor}
      </DataTableCellText>
    ),
    enableSorting: false,
    meta: { label: "Actor" },
  },
  {
    accessorKey: "action",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column}>{actionLabel(row.original.action)}</DataTableCellText>
    ),
    enableSorting: false,
    meta: { label: "Action" },
  },
  {
    accessorKey: "summary",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="text-muted-foreground">
        {row.original.summary}
      </DataTableCellText>
    ),
    enableSorting: false,
    meta: { label: "Summary" },
  },
  // Time is the only sortable column, because it is the only sort the route offers: a log's one axis is when. Leaving the other headers sortable would have offered three controls that flip the time direction and nothing else.
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} />,
    // Rows only ever render on the client, so the reader's own locale and clock are safe to read here.
    cell: ({ column, row }) => (
      <DataTableCellText column={column} className="text-muted-foreground">
        {relativeTime(row.original.createdAt, new Date())}
      </DataTableCellText>
    ),
    meta: { label: "When" },
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
              onClick={() => copyToClipboard(activityJson([row.original]), "Event copied")}
            >
              Copy event
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyToClipboard(row.original.actor, "Actor copied")}>
              Copy actor
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableHiding: false,
    enableSorting: false,
  },
]
