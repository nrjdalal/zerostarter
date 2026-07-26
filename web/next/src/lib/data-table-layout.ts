import type { ColumnDef, RowData } from "@tanstack/react-table"
import rawFontMetrics from "generated/data-table-metrics.json"

// The data table's layout math: pure arithmetic over the column config and the build-time font metrics, with no React and no DOM. It lives beside the module rather than inside it so it can be exercised directly (tests/web/next/src/lib); components/data-table.tsx re-exports the parts consumers use, so a table still imports everything from one place.

// Column meta carried from the column config: labels for the view-options menu, plus the layout and overflow flags the renderer reads.
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "center" | "left" | "right"
    auto?: boolean
    flex?: boolean
    label?: string
    wrap?: boolean
  }
}

export type ColumnConfig = {
  align?: "center" | "left" | "right"
  extra?: number
  flex?: boolean
  width?: number
  wrap?: boolean
}

// A widthless column sizes as header title + an allowance in spacing units, snapped up to the 3-unit grid: config.extra when set, else this default (10 = 2.5rem: the cell inset plus the sort button's gap, icon, and inset).
export const AUTO_WIDTH_EXTRA_UNITS = 10

// The app header font (text-sm font-medium) as bundled data: per-character advances plus sparse kerning-pair deltas in px at 500 14px, generated at build by packages/scripts/src/data-table-metrics.ts, so any label measures the same on server and client and SSR ships final widths with no settle. The generator asserts this exact algorithm against real font shaping.
const fontMetrics: {
  advances: Record<string, number>
  average: number
  kerning: Record<string, number>
} = rawFontMetrics

export function measureLabelPx(label: string): number {
  let widthPx = 0
  let previous = ""
  for (const char of label) {
    const advance = fontMetrics.advances[char]
    widthPx += advance !== undefined ? advance : fontMetrics.average
    if (previous) {
      const pair = fontMetrics.kerning[previous + char]
      if (pair !== undefined) widthPx += pair
    }
    previous = char
  }
  return widthPx
}

// px converts to spacing units at the default scale (1 unit = 4px).
export function autoWidthUnits(label: string, extraUnits: number): number {
  return Math.ceil((measureLabelPx(label) / 4 + extraUnits) / 3) * 3
}

// Folds a table's column config into its defs by column id (id, else accessorKey), so useReactTable sees size plus the align/flex/wrap meta. A widthless config sizes from its header label via the bundled metrics. Flex capability reaches back from a flex column to every column before it. useDataTable applies this via its columnConfig option; client-side tables call it directly.
export function applyColumnManager<TData extends RowData>(
  columns: ColumnDef<TData>[],
  columnConfig: Record<string, ColumnConfig>,
): ColumnDef<TData>[] {
  const configFor = (column: ColumnDef<TData>) => {
    const id = column.id
      ? column.id
      : "accessorKey" in column
        ? String(column.accessorKey)
        : undefined
    return { config: id ? columnConfig[id] : undefined, id }
  }
  let lastFlex = -1
  columns.forEach((column, index) => {
    const { config } = configFor(column)
    if (config && config.flex) lastFlex = index
  })
  return columns.map((column, index) => {
    const { config: entry, id } = configFor(column)
    if (!id) return column
    // An id with no entry takes the defaults rather than passing through: untouched, it would keep tanstack's size default of 150, which this renderer reads as 150 spacing units (600px).
    const config = entry ? entry : {}
    const label = column.meta && column.meta.label ? column.meta.label : id
    const width =
      config.width !== undefined
        ? config.width
        : autoWidthUnits(label, config.extra !== undefined ? config.extra : AUTO_WIDTH_EXTRA_UNITS)
    return {
      ...column,
      size: width,
      meta: {
        ...column.meta,
        align: config.align ? config.align : "left",
        // auto marks widthless columns: a table with no flex column spreads them instead of trailing dead space
        auto: config.width === undefined,
        flex: index <= lastFlex,
        wrap: config.wrap ? true : false,
      },
    }
  })
}

// Slack ownership over the visible columns, in order: of the flex-capable ones (capability reaches back from a flex column) only the last grows, so the rest hold their width, hiding the growing column hands growth backward, and two growing neighbors cannot fight. A table with no flex column spreads its widthless columns instead. Everything else holds its width, so a narrow viewport overflows into the region's horizontal scroll rather than crushing cells. Keyed by id because headers and cells iterate their own arrays.
export function growingColumnIds(
  columns: { auto?: boolean; flex?: boolean; id: string }[],
): Set<string> {
  const growing = new Set<string>()
  const anyCapable = columns.some((column) => column.flex)
  columns.forEach((column, index) => {
    if (!anyCapable) {
      if (column.auto) growing.add(column.id)
      return
    }
    const next = columns[index + 1]
    if (column.flex && !(next && next.flex)) growing.add(column.id)
  })
  return growing
}

// Maps a table's column id onto the endpoint's sort whitelist. hasOwn, not `in`: the URL parser accepts any id, and `"constructor" in fields` is true through the prototype chain, so `in` would send Object itself as the sort and park the table on the API's 400.
export function resolveSort<TFields extends Record<string, string>>(
  fields: TFields,
  id: string,
  fallback: TFields[keyof TFields],
): TFields[keyof TFields] {
  return Object.hasOwn(fields, id) ? fields[id as keyof TFields] : fallback
}

// Facet options from the values an endpoint accepts, so a filter cannot offer a value the API would reject or miss one it would take.
// The values of a facet the endpoint would accept, dropping the rest, so a hand-written ?role=bogus degrades to an unfiltered list instead of 400ing the table into its error state. Written once here now that all three console tables want it.
export function acceptedFacet<T extends string>(
  selected: string[] | undefined,
  allowed: readonly T[],
): T[] {
  if (!selected) return []
  return selected.filter((value): value is T => allowed.some((option) => option === value))
}

export function facetOptions<T extends string>(values: readonly T[]) {
  return values.map((value) => ({ label: `${value[0].toUpperCase()}${value.slice(1)}`, value }))
}
