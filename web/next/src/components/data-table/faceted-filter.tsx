"use client"

import { RiAddCircleLine, RiCheckLine, type RemixiconComponentType } from "@remixicon/react"
import type { Column } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface DataTableFacetedFilterProps<TData, TValue> {
  column: Column<TData, TValue> | undefined
  options: { icon?: RemixiconComponentType; label: string; value: string }[]
  title: string
}

// Multi-select filter over a column's values; renders nothing when the column is absent so call sites can pass table.getColumn(...) directly.
function DataTableFacetedFilter<TData, TValue>({
  column,
  options,
  title,
}: DataTableFacetedFilterProps<TData, TValue>) {
  if (!column) return null

  // Counts need the faceted row models wired on the table; a server-driven table skips them and shows no counts.
  let facets: Map<unknown, number> | undefined
  try {
    facets = column.getFacetedUniqueValues()
  } catch {
    facets = undefined
  }

  const filterValue = column.getFilterValue()
  const selectedValues = new Set(Array.isArray(filterValue) ? (filterValue as string[]) : [])

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="border-dashed" />}>
        <RiAddCircleLine />
        {title}
        {selectedValues.size > 0 && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="secondary" className="lg:hidden">
              {selectedValues.size}
            </Badge>
            <div className="hidden gap-1 lg:flex">
              {selectedValues.size > 2 ? (
                <Badge variant="secondary">{selectedValues.size} selected</Badge>
              ) : (
                options
                  .filter((option) => selectedValues.has(option.value))
                  .map((option) => (
                    <Badge key={option.value} variant="secondary">
                      {option.label}
                    </Badge>
                  ))
              )}
            </div>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-0">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                const count = facets ? facets.get(option.value) : undefined
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value)
                      } else {
                        selectedValues.add(option.value)
                      }
                      const next = Array.from(selectedValues)
                      column.setFilterValue(next.length ? next : undefined)
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border border-input",
                        isSelected && "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {isSelected && <RiCheckLine className="size-3.5" />}
                    </span>
                    {option.icon && <option.icon className="text-muted-foreground" />}
                    <span>{option.label}</span>
                    {typeof count === "number" && count > 0 && (
                      <span className="text-muted-foreground ml-auto font-mono text-xs">
                        {count}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column.setFilterValue(undefined)}
                    className="justify-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { DataTableFacetedFilter }
