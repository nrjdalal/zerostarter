"use client"
"use no memo"

import { ALLOWLIST_KINDS, parseAllowlistRule, type AllowlistRule } from "@packages/auth/access"
import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { InferRequestType } from "hono/client"
import * as React from "react"
import { z } from "zod"

import {
  allowlistColumnConfig,
  allowlistColumns,
  type AllowlistRuleRow,
} from "@/app/(console)/console/(access)/allowlist/components/data-columns"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { useConsoleRole } from "@/components/console/role"
import {
  DataTable,
  DataTableFacetedFilter,
  DataTableToolbar,
  useDataTable,
  type DataTablePage,
  type DataTablePageInput,
} from "@/components/data-table"
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { runBatched, toastBulk } from "@/lib/api/bulk"
import { apiClient, unwrap } from "@/lib/api/client"
import { acceptedFacet, facetOptions, resolveSort } from "@/lib/data-table-layout"

const DEFAULT_SORT = { desc: true, id: "createdAt" }
const DEFAULT_SORTING = [DEFAULT_SORT]

// Column ids mapped to the endpoint's sort whitelist; satisfies makes a server-side rename a compile error here.
type AllowlistSort = NonNullable<
  InferRequestType<typeof apiClient.v1.admin.allowlist.$get>["query"]["sort"]
>
const SORT_FIELDS = {
  actor: "actor",
  createdAt: "createdAt",
  kind: "kind",
  value: "value",
} as const satisfies Record<string, AllowlistSort>
// Derived from the shared list rather than restated, the same argument the users table makes for its role facet.
const KIND_OPTIONS = facetOptions(ALLOWLIST_KINDS)
// Mirrors the endpoint's q cap so a hand-written URL cannot 400 the table.
const Q_MAX = 254
// The endpoint's own cap on a rule value. The same number as Q_MAX today and deliberately its own constant: one bounds a search term, the other an email address.
const RULE_MAX = 254

const formSchema = z.object({
  value: z
    .string()
    .max(RULE_MAX)
    .refine((input) => parseAllowlistRule(input) !== null, {
      message: "Enter a domain like @example.com or a full email address.",
    }),
})

async function fetchRules({
  filters,
  page,
  perPage,
  search,
  sorting,
}: DataTablePageInput): Promise<DataTablePage<AllowlistRuleRow>> {
  const kinds = acceptedFacet(filters.kind, ALLOWLIST_KINDS)
  const sort = sorting.length ? sorting[0] : DEFAULT_SORT
  const sortId = resolveSort(SORT_FIELDS, sort.id, "createdAt")
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
  return { rows: data.rules, hasNextPage: data.hasNextPage, page: data.page, total: data.total }
}

// Says who a rule lets in, in the same words the add dialog previews.
function describeRule(rule: AllowlistRule) {
  return rule.kind === "domain"
    ? `Anyone at ${rule.value.slice(1)} gets console access`
    : `${rule.value} gets console access`
}

// The rules granting console access. The whole Access group is admin and above, on the page, in the nav and on every route behind it, so canWrite is true for anyone who can see this table; the affordances still ask, because a control that exists only to refuse invites the attempt.
export function AllowlistDataTable() {
  const { canWrite } = useConsoleRole()
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = React.useState<{
    fromSelection: boolean
    rules: AllowlistRuleRow[]
  } | null>(null)

  const columns = React.useMemo(
    () => allowlistColumns((rule) => setPendingDelete({ fromSelection: false, rules: [rule] })),
    [],
  )
  const { selected, table, tableProps } = useDataTable({
    columnConfig: allowlistColumnConfig,
    columns,
    defaultSorting: DEFAULT_SORTING,
    enableRowSelection: true,
    fetchPage: fetchRules,
    filterIds: ["kind"],
    getRowId: (row) => row.id,
    queryKey: "console-allowlist",
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["console-allowlist"] })

  // One request for the selection, and the reply carries a line per rule, so a rule that was already gone is reported as itself rather than failing the whole removal.
  const remove = useMutation({
    mutationFn: async ({ rules }: { fromSelection: boolean; rules: AllowlistRuleRow[] }) =>
      runBatched(
        rules.map((rule) => rule.id),
        (ids) => unwrap(apiClient.v1.admin.allowlist.$delete({ json: { ids } })),
      ),
    onSuccess: (outcome, { fromSelection }) => {
      setPendingDelete(null)
      // Only what the selection bar started clears the selection: a row-menu removal has nothing to do with the rows someone has staged for a batch.
      if (fromSelection) table.resetRowSelection()
      toastBulk(outcome, "removed", "Rule removed")
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
        selectionActions={
          canWrite ? (
            <Button
              variant="destructive"
              onClick={() => setPendingDelete({ fromSelection: true, rules: selected })}
            >
              Remove
            </Button>
          ) : undefined
        }
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
      <ConfirmDialog
        action="Remove"
        variant="destructive"
        open={pendingDelete !== null}
        pending={remove.isPending}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
        title={
          pendingDelete && pendingDelete.rules.length === 1
            ? `Remove ${pendingDelete.rules[0].value}?`
            : `Remove ${pendingDelete ? pendingDelete.rules.length : 0} rules?`
        }
        description="Anyone already promoted keeps their role; removing a rule only stops future grants. Demote them from the Users table if that is what you want."
      />
    </div>
  )
}

// One field, because a rule is one string. The preview says who it will admit before it is added.
function AddRuleDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = React.useState(false)

  const create = useMutation({
    mutationFn: async (input: string) => {
      const { data, error } = await unwrap(
        apiClient.v1.admin.allowlist.$post({ json: { value: input } }),
      )
      if (error) throw new Error(error.message)
      return data
    },
    onError: (error) => toast.add({ title: error.message, type: "error" }),
    onSuccess: (data) => {
      setOpen(false)
      form.reset()
      toast.add({ title: `${data.rule.value} added`, type: "success" })
      onAdded()
    },
  })

  // The schema is parseAllowlistRule itself, so the field accepts exactly what the API will: one rule, written once, checked on both sides of the request.
  const form = useForm({
    defaultValues: { value: "" },
    onSubmit: async ({ value }) => {
      const rule = parseAllowlistRule(value.value)
      if (rule) await create.mutateAsync(rule.value)
    },
    validators: { onChange: formSchema, onSubmit: formSchema },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) form.reset()
      }}
    >
      <DialogTrigger render={<Button />}>Add rule</DialogTrigger>
      {/* The form IS the popup: DialogContent lays its children out and DialogFooter bleeds to the popup edges, so wrapping them in a form instead would collapse every gap and misalign that bleed. */}
      <DialogContent
        render={
          <form
            onSubmit={(event) => {
              event.preventDefault()
              form.handleSubmit()
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
          <form.Field name="value">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              const parsed = parseAllowlistRule(field.state.value)
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Domain or email address</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    autoComplete="off"
                    maxLength={RULE_MAX}
                    placeholder="@example.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    disabled={create.isPending}
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : (
                    <FieldDescription>
                      {parsed
                        ? describeRule(parsed)
                        : "For example @example.com, or ada@example.com."}
                    </FieldDescription>
                  )}
                </Field>
              )
            }}
          </form.Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="submit" disabled={create.isPending}>
            Add rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
