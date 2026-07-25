import { measureNaturalWidth, prepareWithSegments } from "@chenglou/pretext"
import type { ColumnDef, RowData } from "@tanstack/react-table"

// The column manager owns every table's layout so columns files carry content only. Widths are Tailwind spacing units (1 = 0.25rem, so 12 = 48px at the default scale) rendered as calc(var(--spacing) * n): exact on a fixed column, the floor on a flex one. Omit width and the column takes a min width measured from its header label instead. "global" holds the semantic archetypes, measured at the default cell padding and type scale; each area.table block maps its column ids onto a config (align and flex optional, defaulting to left and false), and names follow what the column says (a column headed Status is status), never the backing field (banned).
const global = {
  // the icon-sm row-actions button
  actions: 12,
  // the row checkbox
  select: 12,
} as const

export type ColumnConfig = {
  align?: "center" | "left" | "right"
  extra?: number
  flex?: boolean
  width?: number
}

export const COLUMN_MANAGER = {
  global,
  // Table blocks are written in column order, matching the table as rendered.
  console: {
    users: {
      select: { align: "center", width: global.select },
      // header title + 12rem
      name: { extra: 48 },
      // floor of header title + 60 units, then grows; flex reaches back through widthless columns, so with email hidden name grows
      email: { extra: 60, flex: true },
      role: { align: "center" },
      status: { align: "center" },
      createdAt: { align: "right", extra: 24 },
      actions: { align: "center", width: global.actions },
    } satisfies Record<string, ColumnConfig>,
  },
} as const

// A widthless column sizes as header title + an allowance in spacing units, snapped up to the 3-unit grid: config.extra when set, else this default (10 = 2.5rem: the cell inset plus the sort button's gap, icon, and inset). SSR has no canvas, so callers fall back to AUTO_WIDTH_FALLBACK until mounted.
const AUTO_WIDTH_FALLBACK = 24
const AUTO_WIDTH_EXTRA_UNITS = 10
const measuredUnits = new Map<string, number>()

// Header title width at the table's header font (text-sm font-medium), via pretext's canvas-backed metrics: pure arithmetic, no DOM layout, cached per label and allowance; px converts to spacing units at the default scale (1 unit = 4px).
function autoWidthUnits(label: string, extraUnits: number): number | undefined {
  if (typeof document === "undefined") return undefined
  const key = `${extraUnits}:${label}`
  const cached = measuredUnits.get(key)
  if (cached !== undefined) return cached
  const family = getComputedStyle(document.body).fontFamily
  const titlePx = measureNaturalWidth(prepareWithSegments(label, `500 14px ${family}`))
  const units = Math.ceil((titlePx / 4 + extraUnits) / 3) * 3
  measuredUnits.set(key, units)
  return units
}

// Folds a table's manager block into its column defs by column id (id, else accessorKey), so useReactTable sees size plus the align/flex meta; columns without an entry pass through untouched. A widthless config measures its header label once measure flips true (after mount, keeping server and hydration renders identical). Flex capability reaches back from a flex column through the widthless columns before it (explicitly sized columns stay fixed), so hiding the growing column hands growth to the previous auto column instead of leaving dead space. Client-side tables call this directly; useDataTable applies it for server-driven ones.
export function applyColumnManager<TData extends RowData>(
  columns: ColumnDef<TData>[],
  manager: Record<string, ColumnConfig>,
  measure = true,
): ColumnDef<TData>[] {
  const configFor = (column: ColumnDef<TData>) => {
    const id = column.id
      ? column.id
      : "accessorKey" in column
        ? String(column.accessorKey)
        : undefined
    return { config: id ? manager[id] : undefined, id }
  }
  let lastFlex = -1
  columns.forEach((column, index) => {
    const { config } = configFor(column)
    if (config && config.flex) lastFlex = index
  })
  return columns.map((column, index) => {
    const { config, id } = configFor(column)
    if (!config || !id) return column
    const label = column.meta && column.meta.label ? column.meta.label : id
    const measured = measure
      ? autoWidthUnits(label, config.extra !== undefined ? config.extra : AUTO_WIDTH_EXTRA_UNITS)
      : undefined
    const width =
      config.width !== undefined
        ? config.width
        : measured !== undefined
          ? measured
          : AUTO_WIDTH_FALLBACK
    const flexCapable = index <= lastFlex && (config.flex === true || config.width === undefined)
    return {
      ...column,
      size: width,
      meta: {
        ...column.meta,
        align: config.align ? config.align : "left",
        // auto marks widthless columns: when every capable column is hidden, the visible autos share the growth so the table spreads without dead space
        auto: config.width === undefined,
        flex: flexCapable,
      },
    }
  })
}
