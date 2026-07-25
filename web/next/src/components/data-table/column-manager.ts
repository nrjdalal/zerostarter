import type { ColumnDef, RowData } from "@tanstack/react-table"

// The column manager owns every table's layout so columns files carry content only. Widths are Tailwind spacing units (1 = 0.25rem, so 12 = 48px at the default scale) rendered as calc(var(--spacing) * n): exact on a fixed column, the floor on a flex one. "global" holds the semantic archetypes, measured at the default cell padding and type scale; each area.table block maps its column ids onto a config (align and flex optional, defaulting to left and false), and names follow what the column says (a column headed Status is status), never the backing field (banned).
const global = {
  // the icon-sm row-actions button
  actions: 6,
  // a compact date; content truncates
  date: 18,
  // a typical address; the usual flex floor
  email: 48,
  // a plain text name
  name: 64,
  // a short role token like Admin or User
  role: 12,
  // the row checkbox
  select: 12,
  // a short state word like Active or Banned
  status: 12,
} as const

export type ColumnConfig = {
  align?: "left" | "right"
  flex?: boolean
  width: number
}

export const COLUMN_MANAGER = {
  global,
  console: {
    users: {
      actions: { width: global.actions },
      createdAt: { width: global.date },
      email: { flex: true, width: global.email },
      name: { width: global.name },
      role: { width: global.role },
      select: { width: global.select },
      status: { width: global.status },
    } satisfies Record<string, ColumnConfig>,
  },
} as const

// Folds a table's manager block into its column defs by column id (id, else accessorKey), so useReactTable sees size plus the align/flex meta; columns without an entry pass through untouched. Client-side tables call this directly; useDataTable applies it for server-driven ones.
export function applyColumnManager<TData extends RowData>(
  columns: ColumnDef<TData>[],
  manager: Record<string, ColumnConfig>,
): ColumnDef<TData>[] {
  return columns.map((column) => {
    const id = column.id
      ? column.id
      : "accessorKey" in column
        ? String(column.accessorKey)
        : undefined
    const config = id ? manager[id] : undefined
    if (!config) return column
    return {
      ...column,
      size: config.width,
      meta: {
        ...column.meta,
        align: config.align ? config.align : "left",
        flex: config.flex ? true : false,
      },
    }
  })
}
