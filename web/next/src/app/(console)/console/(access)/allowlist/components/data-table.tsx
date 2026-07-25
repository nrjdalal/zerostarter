"use client"
"use no memo"

import { parseAllowlistRule } from "@packages/auth/access"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { InferRequestType } from "hono/client"
import * as React from "react"
import { toast } from "sonner"

import {
  allowlistColumnConfig,
  allowlistColumns,
  describeRule,
  type AllowlistRuleRow,
} from "@/app/(console)/console/(access)/allowlist/components/data-columns"
import { useConsoleRole } from "@/components/console/role"
import {
  DataTable,
  DataTableFacetedFilter,
  DataTableToolbar,
  useDataTable,
  type DataTablePage,
  type DataTablePageInput,
} from "@/components/data-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { apiClient, unwrap } from "@/lib/api/client"

const DEFAULT_SORT = { desc: true, id: "createdAt" }
const DEFAULT_SORTING = [DEFAULT_SORT]

// Column ids mapped to the endpoint's sort whitelist; satisfies makes a server-side rename a compile error here.
type AllowlistSort = NonNullable<
  InferRequestType<typeof apiClient.v1.admin.allowlist.$get>["query"]["sort"]
>
const SORT_FIELDS = {
  createdAt: "createdAt",
  createdByName: "createdByName",
  kind: "kind",
  value: "value",
} as const satisfies Record<string, AllowlistSort>
const KIND_OPTIONS = [
  { label: "Domain", value: "domain" },
  { label: "Email", value: "email" },
]
const KIND_VALUES = new Set(KIND_OPTIONS.map((option) => option.value))
// Mirrors the endpoint's q cap so a hand-written URL cannot 400 the table.
const Q_MAX = 254

async function fetchRules({
  filters,
  page,
  perPage,
  search,
  sorting,
}: DataTablePageInput): Promise<DataTablePage<AllowlistRuleRow>> {
  const kinds = filters.kind ? filters.kind.filter((kind) => KIND_VALUES.has(kind)) : []
  const sort = sorting.length ? sorting[0] : DEFAULT_SORT
  const sortId = Object.hasOwn(SORT_FIELDS, sort.id)
    ? SORT_FIELDS[sort.id as keyof typeof SORT_FIELDS]
    : "createdAt"
  const { data, error } = await unwrap(
    apiClient.v1.admin.allowlist.$get({
      query: {
        dir: sort.desc ? "desc" : "asc",
        kind: kinds.length ? kinds.join(",") : undefined,
        page: `${page}`,
        perPage: `${perPage}`,
        q: search ? search.slice(0, Q_MAX) : undefined,
        sort: sortId,
      },
    }),
  )
  if (error) throw new Error(error.message)
  return { rows: data.rules, total: data.total }
}

// The rules granting console access. Reading is a member power, changing is an admin one, so the add and remove affordances are absent below that rung.
export function AllowlistDataTable() {
  const { canWrite } = useConsoleRole()
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = React.useState<AllowlistRuleRow | null>(null)

  const columns = React.useMemo(() => allowlistColumns(setPendingDelete), [])
  const { table, tableProps } = useDataTable({
    columnConfig: allowlistColumnConfig,
    columns,
    defaultSorting: DEFAULT_SORTING,
    fetchPage: fetchRules,
    filterIds: ["kind"],
    getRowId: (row) => row.id,
    queryKey: "console-allowlist",
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["console-allowlist"] })

  const remove = useMutation({
    mutationFn: async (rule: AllowlistRuleRow) => {
      const { error } = await unwrap(
        apiClient.v1.admin.allowlist[":id"].$delete({ param: { id: rule.id } }),
      )
      if (error) throw new Error(error.message)
    },
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      setPendingDelete(null)
      toast.success("Rule removed")
      refresh()
    },
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DataTableToolbar
        actions={canWrite ? <AddRuleDialog onAdded={refresh} /> : undefined}
        table={table}
        searchMaxLength={Q_MAX}
        searchPlaceholder="Search rules..."
      >
        <DataTableFacetedFilter
          column={table.getColumn("kind")}
          options={KIND_OPTIONS}
          title="Kind"
        />
      </DataTableToolbar>
      <DataTable
        {...tableProps}
        aria-label="Allowlist"
        empty={
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No rules yet</EmptyTitle>
              <EmptyDescription>
                Nobody reaches the console from a rule. Add one to give a domain or an address
                member access.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {pendingDelete?.value}?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone already promoted keeps their role; removing a rule only stops future grants.
              Demote them from the Users table if that is what you want.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => pendingDelete && remove.mutate(pendingDelete)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// One field, because a rule is one string. The preview says who it will admit before it is added.
function AddRuleDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const parsed = parseAllowlistRule(value)

  const create = useMutation({
    mutationFn: async (input: string) => {
      const { data, error } = await unwrap(
        apiClient.v1.admin.allowlist.$post({ json: { value: input } }),
      )
      if (error) throw new Error(error.message)
      return data
    },
    onError: (error) => toast.error(error.message),
    onSuccess: (data) => {
      setOpen(false)
      setValue("")
      toast.success(`${data.rule.value} added`)
      onAdded()
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setValue("")
      }}
    >
      <DialogTrigger render={<Button />}>Add rule</DialogTrigger>
      {/* The form IS the popup: DialogContent lays its children out and DialogFooter bleeds to the popup edges, so wrapping them in a form instead would collapse every gap and misalign that bleed. */}
      <DialogContent
        render={
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (parsed) create.mutate(value)
            }}
          />
        }
      >
        <DialogHeader>
          <DialogTitle>Add a rule</DialogTitle>
          <DialogDescription>
            A domain covers everyone at it, an address covers one person. Both get member, the
            read-only rung; promote further from the Users table.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="allowlist-value">Domain or email address</FieldLabel>
            <Input
              id="allowlist-value"
              autoComplete="off"
              maxLength={Q_MAX}
              placeholder="@example.com"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <FieldDescription>
              {value.trim() === ""
                ? "For example @example.com, or ada@example.com."
                : parsed
                  ? describeRule(parsed)
                  : "Enter a domain like @example.com or a full email address."}
            </FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="submit" disabled={!parsed || create.isPending}>
            Add rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
