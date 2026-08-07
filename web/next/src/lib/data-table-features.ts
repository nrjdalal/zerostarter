import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createSortedRowModel,
  globalFilteringFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/react-table"

// The table features this app registers, and the single value every table type is generic over. v9 bundles nothing by default: a method is only on the instance when its feature is registered here, and a row model only exists when its slot is filled. Registered explicitly rather than through stockFeatures so the bundle carries only what the console's tables call.
export const features = tableFeatures({
  columnFacetingFeature,
  columnFilteringFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
})

// Infer rather than hand-write: every ColumnDef, Column, and Table type in the app is parameterized by this.
export type Features = typeof features
