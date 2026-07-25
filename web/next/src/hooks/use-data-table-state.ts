"use client"

import type { ColumnFiltersState, OnChangeFn, SortingState, Updater } from "@tanstack/react-table"
import { createParser, parseAsArrayOf, parseAsString, useQueryStates } from "nuqs"
import * as React from "react"

// SortingState in the URL as "column.asc" or "column.desc", comma-separated for multi-sort.
const parseAsSorting = createParser<SortingState>({
  parse(value) {
    const sorting: SortingState = []
    for (const part of value.split(",")) {
      const [id, direction] = part.split(".")
      if (id && (direction === "asc" || direction === "desc")) {
        sorting.push({ desc: direction === "desc", id })
      }
    }
    return sorting.length ? sorting : null
  },
  serialize(value) {
    return value.map((entry) => `${entry.id}.${entry.desc ? "desc" : "asc"}`).join(",")
  },
  eq(a, b) {
    return (
      a.length === b.length &&
      a.every((entry, index) => entry.id === b[index].id && entry.desc === b[index].desc)
    )
  },
})

const filterParser = parseAsArrayOf(parseAsString).withDefault([])

// Parser identities must be stable across renders (nuqs caches parsed values per parser); building this inline in the hook would defeat the cache and leave useSyncExternalStore reading one update behind.
const baseParsers = {
  q: parseAsString.withDefault(""),
  sort: parseAsSorting.withDefault([]),
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater
}

// URL-synced table state (q, sort, plus one array param per filter id), shaped for useReactTable: spread the returned state into `state` and the handlers into the matching onChange options. Tables scroll infinitely, so there is no page state; a queryKey built from these values resets the list on any change. Filter ids share the query-string namespace, so keep them clear of q/sort.
export function useDataTableState(filterIds: string[] = []) {
  const filterKey = filterIds.join(",")
  const filterParsers = React.useMemo(() => {
    const parsers: Record<string, typeof filterParser> = {}
    for (const id of filterKey ? filterKey.split(",") : []) parsers[id] = filterParser
    return parsers
  }, [filterKey])

  const [base, setBase] = useQueryStates(baseParsers)
  const [filters, setFilters] = useQueryStates(filterParsers)

  const sorting = base.sort
  const globalFilter = base.q
  const columnFilters: ColumnFiltersState = React.useMemo(
    () =>
      Object.entries(filters)
        .filter(([, value]) => value.length > 0)
        .map(([id, value]) => ({ id, value })),
    [filters],
  )

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    setBase({ sort: resolveUpdater(updater, sorting) })
  }
  // Widened to undefined: table.resetGlobalFilter() passes initialState.globalFilter, which is undefined here.
  const onGlobalFilterChange = (updater: Updater<string | undefined>) => {
    const next = resolveUpdater<string | undefined>(updater, globalFilter)
    setBase({ q: next ? next : null })
  }
  const onColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    const next = resolveUpdater(updater, columnFilters)
    const patch: Record<string, string[] | null> = {}
    for (const id of Object.keys(filterParsers)) {
      const entry = next.find((filter) => filter.id === id)
      patch[id] =
        entry && Array.isArray(entry.value) && entry.value.length ? (entry.value as string[]) : null
    }
    setFilters(patch)
  }

  return {
    columnFilters,
    globalFilter,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onSortingChange,
    sorting,
  }
}
